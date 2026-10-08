import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

export const ownerA = "11111111-1111-4111-8111-111111111111";
export const ownerB = "44444444-4444-4444-8444-444444444444";
export const jobA = "22222222-2222-4222-8222-222222222222";
export const jobB = "55555555-5555-4555-8555-555555555555";
export const mediaA = "33333333-3333-4333-8333-333333333333";
export const mediaB = "66666666-6666-4666-8666-666666666666";

export async function isolatedDatabase() {
  const db = new PGlite();
  // Sustrato mínimo de plataforma. Las políticas y funciones del producto se
  // ejecutan desde las migraciones reales, con RLS PostgreSQL y roles no privilegiados.
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
        nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
    $$;
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets,
      name text not null, unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to anon,authenticated;
    grant select on storage.objects to anon;
    grant select,insert,delete on storage.objects to authenticated;
    create function storage.operation() returns text language plpgsql stable as $$
      begin return current_setting('storage.operation',true); end;
    $$;
    create function storage.allow_any_operation(expected_operations text[]) returns boolean language sql stable as $$
      with current_operation as (select storage.operation() as raw_operation), normalized as (
        select case when raw_operation like 'storage.%' then substr(raw_operation,9) else raw_operation end as current_operation
        from current_operation)
      select exists(select 1 from normalized n cross join lateral unnest(expected_operations) as expected_operation
        where expected_operation is not null and expected_operation <> ''
        and n.current_operation = case when expected_operation like 'storage.%' then substr(expected_operation,9) else expected_operation end);
    $$;
  `);
  await db.exec(await readFile("supabase/migrations/20261006061544_gate3a_jobs_security.sql", "utf8"));
  for (const name of (await readdir("supabase/migrations")).filter(name => name.endsWith("_responsive_private_derivatives.sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
  }
  for (const name of (await readdir("supabase/migrations")).filter(name => name.endsWith("_job_hours_description.sql")).sort()) {
    await db.exec(await readFile(`supabase/migrations/${name}`, "utf8"));
  }
  await db.query("insert into auth.users(id) values ($1),($2)", [ownerA,ownerB]);
  await db.query("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Fixture A','2026-10-07'),($3,$4,'Fixture B','2026-10-07')",[jobA,ownerA,jobB,ownerB]);
  await db.query("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',0,1,1,1),($4,$5,$6,'image/png',0,1,1,1)", [mediaA,jobA,`${ownerA}/${jobA}/${mediaA}.png`,mediaB,jobB,`${ownerB}/${jobB}/${mediaB}.png`]);
  return db;
}

export async function asRole<T>(db: PGlite, role: "anon" | "authenticated", uid: string | null, operation: string, sql: string, params: unknown[] = []) {
  return db.transaction(async tx => {
    await tx.exec(`set local role ${role}`);
    await tx.query("select set_config('request.jwt.claims',$1,true),set_config('storage.operation',$2,true)", [JSON.stringify({sub:uid,role}),operation]);
    return tx.query<T>(sql,params);
  });
}
