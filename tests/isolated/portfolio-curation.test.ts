import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
vi.mock("server-only", () => ({}));
import { deletePhoto } from "@/features/jobs/data";
import { portfolioSettings, setFeaturedTransformation, setPhotoHidden, setPinnedJob, curationState } from "@/features/jobs/curation";
import { asRole, jobA, jobB, mediaA, mediaB, ownerA, ownerB } from "./database";
import { storageFixture } from "./storage-fixture";

// Ruta real: DAL → REST fixture → PostgreSQL con RLS, grants, FK y funciones de las migraciones.
let fixture: Awaited<ReturnType<typeof storageFixture>>;
const mediaA2 = "77777777-7777-4777-8777-777777777777";
const mediaA3 = "88888888-8888-4888-8888-888888888888";
const jobC = "99999999-9999-4999-8999-999999999999";
const mediaC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sidecars = (job: string, media: string) => [`${job}/${media}/320.webp`, `${job}/${media}/390.webp`, `${job}/${media}/640.webp`, `${job}/${media}/768.webp`];

const q = (sql: string, params: unknown[] = []) => fixture.db.query<Record<string, unknown>>(sql, params);
const as = (role: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = [], operation = "") => asRole<Record<string, unknown>>(fixture.db, role, uid, operation, sql, params);
const listed = async (limit = 50, offset = 0) => (await as("anon", null, "select id, media from public.list_public_jobs($1,$2)", [limit, offset])).rows as { id: string; media: { id: string }[] }[];
const featured = async () => (await as("anon", null, "select * from public.get_featured_transformation()")).rows;
const settings = async () => (await q("select * from public.portfolio_settings")).rows;

async function addMedia(job: string, owner: string, media: string, position: number) {
  await q("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',$4,1,1,1)", [media, job, `${owner}/${job}/${media}.png`, position]);
  await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${job}/${media}.webp`]);
}
beforeAll(async () => {
  fixture = await storageFixture();
  // ownerA: jobA (2026-10-07, fotos A, A2, A3) y jobC (2026-10-20, foto C). Todo con master existente.
  await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Trabajo C','2026-10-20')", [jobC, ownerA]);
  await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${mediaA}.webp`]);
  await addMedia(jobA, ownerA, mediaA2, 1);
  await addMedia(jobA, ownerA, mediaA3, 2);
  await addMedia(jobC, ownerA, mediaC, 0);
});
afterAll(async () => { await fixture?.close(); });
beforeEach(async () => {
  await q("delete from public.portfolio_settings");
  await q("update public.jobs set is_public=false");
  await q("update public.job_media set hidden_from_home=false");
  await q("delete from storage.objects where name like '%/%/%.webp'");
});

describe("migración", () => {
  it("las fotos existentes siguen visibles y no hay ajustes: la proyección no cambia", async () => {
    expect((await q("select hidden_from_home from public.job_media")).rows.every(row => row.hidden_from_home === false)).toBe(true);
    expect(await settings()).toHaveLength(0);
    await q("update public.jobs set is_public=true where id in ($1,$2)", [jobA, jobC]);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobA]);
    expect((await listed())[1].media.map(photo => photo.id)).toEqual([mediaA, mediaA2, mediaA3]);
    expect(await featured()).toEqual([]);
  });
  it("la siembra traslada la transformación fija anterior y es idempotente; sin esos IDs no hace nada", async () => {
    const sql = (await readFile("supabase/migrations/20261010120000_portfolio_curation.sql", "utf8")).match(/insert into public\.portfolio_settings[\s\S]*?on conflict \(owner_id\) do nothing;/)![0];
    await q(sql);
    expect(await settings()).toHaveLength(0);
    const seededJob = "8f507ad1-9bec-400d-8663-9a516545ffc9", before = "504d65a0-39e0-4e22-96d5-ce924d6bf1b6", after = "48ccc1f5-1f4a-42ca-a11a-1d32ebb8a338";
    await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Suzuki','2026-10-01')", [seededJob, ownerA]);
    await addMedia(seededJob, ownerA, before, 0); await addMedia(seededJob, ownerA, after, 1);
    await q(sql); await q(sql);
    expect(await settings()).toMatchObject([{ owner_id: ownerA, featured_job_id: seededJob, featured_before_id: before, featured_after_id: after, pinned_job_id: null }]);
    await q("delete from public.portfolio_settings"); await q("delete from public.job_media where job_id=$1", [seededJob]); await q("delete from public.jobs where id=$1", [seededJob]);
  });
});

describe("trabajo fijado", () => {
  beforeEach(async () => { await q("update public.jobs set is_public=true where id in ($1,$2)", [jobA, jobC]); });
  it("va primero, sin repetirse al paginar, y se puede desfijar", async () => {
    await setPinnedJob(fixture.client(ownerA), ownerA, jobA);
    expect((await listed()).map(job => job.id)).toEqual([jobA, jobC]);
    expect((await listed(1, 0)).map(job => job.id)).toEqual([jobA]);
    expect((await listed(1, 1)).map(job => job.id)).toEqual([jobC]);
    await setPinnedJob(fixture.client(ownerA), ownerA, null);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobA]);
  });
  it("como mucho uno: fijar otro lo sustituye en la misma fila", async () => {
    const client = fixture.client(ownerA);
    await setPinnedJob(client, ownerA, jobA); await setPinnedJob(client, ownerA, jobC);
    expect(await settings()).toMatchObject([{ owner_id: ownerA, pinned_job_id: jobC }]);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobA]);
  });
  it("un trabajo que deja de estar publicado no aparece, y al republicar vuelve a ir arriba (selección dormida)", async () => {
    await setPinnedJob(fixture.client(ownerA), ownerA, jobA);
    await q("update public.jobs set is_public=false where id=$1", [jobA]);
    expect((await listed()).map(job => job.id)).toEqual([jobC]);
    await q("update public.jobs set is_public=true where id=$1", [jobA]);
    expect((await listed()).map(job => job.id)).toEqual([jobA, jobC]);
  });
  it("exige un trabajo propio y publicado", async () => {
    await expect(setPinnedJob(fixture.client(ownerB), ownerB, jobA)).rejects.toMatchObject({ status: 404 });
    await q("update public.jobs set is_public=false where id=$1", [jobA]);
    await expect(setPinnedJob(fixture.client(ownerA), ownerA, jobA)).rejects.toMatchObject({ status: 409 });
    expect(await settings()).toHaveLength(0);
  });
  it("desfijar sin ajustes no crea filas", async () => {
    await setPinnedJob(fixture.client(ownerA), ownerA, null);
    expect(await settings()).toHaveLength(0);
  });
});

describe("fotos ocultas", () => {
  beforeEach(async () => { await q("update public.jobs set is_public=true where id=$1", [jobA]); for (const media of [mediaA, mediaA2, mediaA3]) await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${media}.webp`]); });
  it("salen de la proyección pública y vuelven al mostrarlas", async () => {
    const client = fixture.client(ownerA);
    await setPhotoHidden(client, ownerA, jobA, mediaA2, true);
    expect((await listed())[0].media.map(photo => photo.id)).toEqual([mediaA, mediaA3]);
    await setPhotoHidden(client, ownerA, jobA, mediaA2, false);
    expect((await listed())[0].media.map(photo => photo.id)).toEqual([mediaA, mediaA2, mediaA3]);
  });
  it("un trabajo sin ninguna foto visible no tiene banda en el muro", async () => {
    for (const media of [mediaA, mediaA2, mediaA3]) await setPhotoHidden(fixture.client(ownerA), ownerA, jobA, media, true);
    expect(await listed()).toEqual([]);
    await setPhotoHidden(fixture.client(ownerA), ownerA, jobA, mediaA2, false);
    expect((await listed()).map(job => job.id)).toEqual([jobA]);
    expect((await listed())[0].media.map(photo => photo.id)).toEqual([mediaA2]);
  });
  it("anon deja de descargar la foto oculta (master y sidecars); el propietario la sigue leyendo", async () => {
    const paths = [`${jobA}/${mediaA2}.webp`, ...sidecars(jobA, mediaA2)];
    for (const path of paths.slice(1)) await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [path]);
    const read = (role: "anon" | "authenticated", uid: string | null, path: string) => as(role, uid, "select name from storage.objects where name=$1", [path], "object.get_authenticated");
    for (const path of paths) expect((await read("anon", null, path)).rows).toHaveLength(1);
    await setPhotoHidden(fixture.client(ownerA), ownerA, jobA, mediaA2, true);
    for (const path of paths) { expect((await read("anon", null, path)).rows).toHaveLength(0); expect((await read("authenticated", ownerA, path)).rows).toHaveLength(1); expect((await read("authenticated", ownerB, path)).rows).toHaveLength(0); }
    expect((await read("anon", null, `${jobA}/${mediaA}.webp`)).rows).toHaveLength(1);
  });
  it("otro propietario no puede ocultar una foto ajena", async () => {
    await expect(setPhotoHidden(fixture.client(ownerB), ownerB, jobA, mediaA, true)).rejects.toMatchObject({ status: 404 });
    await expect(setPhotoHidden(fixture.client(ownerB), ownerB, jobB, mediaA, true)).rejects.toMatchObject({ status: 404 });
    expect((await q("select hidden_from_home from public.job_media where id=$1", [mediaA])).rows[0].hidden_from_home).toBe(false);
    expect((await as("authenticated", ownerB, "update public.job_media set hidden_from_home=true where id=$1 returning id", [mediaA])).rows).toHaveLength(0);
  });
  it("anon no puede escribir la columna ni leer la tabla", async () => {
    await expect(as("anon", null, "update public.job_media set hidden_from_home=true")).rejects.toMatchObject({ code: "42501" });
    await expect(as("anon", null, "select hidden_from_home from public.job_media")).rejects.toMatchObject({ code: "42501" });
  });
});

describe("transformación destacada", () => {
  const select = { job_id: jobA, before_id: mediaA, after_id: mediaA2 };
  beforeEach(async () => { await q("update public.jobs set is_public=true where id=$1", [jobA]); for (const media of [mediaA, mediaA2, mediaA3]) await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${media}.webp`]); });
  it("la proyección entrega el trabajo y los dos IDs, sin campos privados", async () => {
    await setFeaturedTransformation(fixture.client(ownerA), ownerA, select);
    const rows = await featured();
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["after_id", "before_id", "description", "id", "job_date", "media", "name"]);
    expect(rows[0]).toMatchObject({ id: jobA, before_id: mediaA, after_id: mediaA2 });
    expect((rows[0].media as { id: string; path: string }[]).map(photo => photo.id)).toEqual([mediaA, mediaA2, mediaA3]);
    expect(JSON.stringify(rows)).not.toMatch(/owner_id|paint_code|work_hours|storage_path|hidden/);
  });
  it("vuelve al título solo si el trabajo deja de ser público, y reaparece al republicar", async () => {
    await setFeaturedTransformation(fixture.client(ownerA), ownerA, select);
    await q("update public.jobs set is_public=false where id=$1", [jobA]);
    expect(await featured()).toEqual([]);
    expect(await settings()).toMatchObject([{ featured_job_id: jobA, featured_before_id: mediaA, featured_after_id: mediaA2 }]);
    await q("update public.jobs set is_public=true where id=$1", [jobA]);
    expect(await featured()).toHaveLength(1);
  });
  it.each([["Antes", "featured_before_id"], ["Después", "featured_after_id"]])("la foto %s sigue en la portada aunque esté oculta del muro, y se retira si pierde su derivado", async (_label, column) => {
    await setFeaturedTransformation(fixture.client(ownerA), ownerA, select);
    const id = (await settings())[0][column] as string;
    await q("update public.job_media set hidden_from_home=true where id=$1", [id]);
    expect(await featured()).toHaveLength(1);
    expect(((await featured())[0].media as { id: string }[]).map(photo => photo.id)).toContain(id);
    expect((await listed())[0].media.map(photo => photo.id)).not.toContain(id);
    await q("update public.job_media set hidden_from_home=false where id=$1", [id]);
    await q("delete from storage.objects where name=$1", [`${jobA}/${id}.webp`]);
    expect(await featured()).toEqual([]);
  });
  it("no se puede elegir una foto repetida, ajena ni de un trabajo privado o ajeno; una oculta del muro sí", async () => {
    const client = fixture.client(ownerA);
    await q("update public.job_media set hidden_from_home=true where id=$1", [mediaA2]);
    await setFeaturedTransformation(client, ownerA, select);
    expect(await featured()).toHaveLength(1);
    await setFeaturedTransformation(client, ownerA, null);
    await q("update public.job_media set hidden_from_home=false where id=$1", [mediaA2]);
    await expect(setFeaturedTransformation(client, ownerA, { ...select, after_id: mediaA })).rejects.toThrow();
    await expect(setFeaturedTransformation(client, ownerA, { ...select, after_id: mediaC })).rejects.toMatchObject({ status: 404 });
    await expect(setFeaturedTransformation(client, ownerA, { job_id: jobB, before_id: mediaB, after_id: mediaA })).rejects.toMatchObject({ status: 404 });
    await expect(setFeaturedTransformation(fixture.client(ownerB), ownerB, select)).rejects.toMatchObject({ status: 404 });
    await q("update public.jobs set is_public=false where id=$1", [jobA]);
    await expect(setFeaturedTransformation(client, ownerA, select)).rejects.toMatchObject({ status: 409 });
    expect(await settings()).toMatchObject([{ featured_job_id: null, featured_before_id: null, featured_after_id: null }]);
  });
  it("cambiar de trabajo sustituye la selección; quitarla vuelve al título solo", async () => {
    const client = fixture.client(ownerA);
    await setFeaturedTransformation(client, ownerA, select);
    await q("update public.jobs set is_public=true where id=$1", [jobC]);
    await addMedia(jobC, ownerA, "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", 1);
    await setFeaturedTransformation(client, ownerA, { job_id: jobC, before_id: mediaC, after_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" });
    expect((await featured())[0]).toMatchObject({ id: jobC, before_id: mediaC });
    await setFeaturedTransformation(client, ownerA, null);
    expect(await featured()).toEqual([]);
    expect(await settings()).toMatchObject([{ featured_job_id: null, featured_before_id: null, featured_after_id: null }]);
    await q("delete from public.job_media where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'");
  });
  it("se puede ocultar una foto de la portada del muro: sigue en la portada", async () => {
    const client = fixture.client(ownerA);
    await setFeaturedTransformation(client, ownerA, select);
    await setPhotoHidden(client, ownerA, jobA, mediaA, true);
    await setPhotoHidden(client, ownerA, jobA, mediaA2, true);
    await setPhotoHidden(client, ownerA, jobA, mediaA3, true);
    expect(await featured()).toHaveLength(1);
    expect(((await featured())[0].media as { id: string }[]).map(photo => photo.id)).toEqual([mediaA, mediaA2]);
    expect(await listed()).toEqual([]);
  });
  it("borrar una foto o el trabajo limpia la selección por FK sin bloquear el borrado", async () => {
    const client = fixture.client(ownerA);
    await setFeaturedTransformation(client, ownerA, select); await setPinnedJob(client, ownerA, jobA);
    await q("delete from public.job_media where id=$1", [mediaA2]);
    expect(await settings()).toMatchObject([{ featured_job_id: jobA, featured_before_id: mediaA, featured_after_id: null, pinned_job_id: jobA }]);
    expect(await featured()).toEqual([]);
    await q("delete from public.job_media where job_id=$1", [jobA]); await q("delete from public.jobs where id=$1", [jobA]);
    expect(await settings()).toMatchObject([{ pinned_job_id: null, featured_job_id: null, featured_before_id: null, featured_after_id: null }]);
    await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Fixture A','2026-10-07')", [jobA, ownerA]);
    await q("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',0,1,1,1)", [mediaA, jobA, `${ownerA}/${jobA}/${mediaA}.png`]);
    await addMedia(jobA, ownerA, mediaA2, 1); await addMedia(jobA, ownerA, mediaA3, 2);
  });
  it("el flujo real de borrado de fotos (deletePhoto) no se bloquea por la selección", async () => {
    const client = fixture.client(ownerA);
    await setFeaturedTransformation(client, ownerA, select);
    await deletePhoto(client, ownerA, jobA, mediaA3);
    expect(await featured()).toHaveLength(1);
    await addMedia(jobA, ownerA, mediaA3, 2);
  });
  it("la ficha privada resume su estado de portada", async () => {
    const client = fixture.client(ownerA);
    await q("update public.jobs set is_public=true where id=$1", [jobC]);
    await setFeaturedTransformation(client, ownerA, select); await setPinnedJob(client, ownerA, jobA);
    expect(await curationState(client, ownerA, jobA)).toEqual({ pinned: true, inCover: true });
    expect(await curationState(client, ownerA, jobC)).toEqual({ pinned: false, inCover: false });
  });
});

describe("RLS, restricciones y fila activa de portfolio_settings", () => {
  const insert = (role: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = []) => as(role, uid, `insert into public.portfolio_settings ${sql}`, params);
  it("anon no tiene ningún privilegio; cada propietario solo ve y escribe lo suyo", async () => {
    await expect(as("anon", null, "select * from public.portfolio_settings")).rejects.toMatchObject({ code: "42501" });
    await expect(insert("anon", null, "(owner_id) values ($1)", [ownerA])).rejects.toMatchObject({ code: "42501" });
    await q("update public.jobs set is_public=true where id=$1", [jobA]);
    await setPinnedJob(fixture.client(ownerA), ownerA, jobA);
    expect((await as("authenticated", ownerB, "select * from public.portfolio_settings")).rows).toHaveLength(0);
    expect((await as("authenticated", ownerA, "select * from public.portfolio_settings")).rows).toHaveLength(1);
    expect((await as("authenticated", ownerB, "update public.portfolio_settings set pinned_job_id=null returning owner_id")).rows).toHaveLength(0);
    expect((await as("authenticated", ownerB, "delete from public.portfolio_settings returning owner_id")).rows).toHaveLength(0);
    expect(await portfolioSettings(fixture.client(ownerB), ownerB)).toBeNull();
  });
  it("no se puede escribir a nombre de otro ni referenciar trabajos ajenos", async () => {
    await expect(insert("authenticated", ownerB, "(owner_id) values ($1)", [ownerA])).rejects.toMatchObject({ code: "42501" });
    await expect(insert("authenticated", ownerB, "(owner_id, pinned_job_id) values ($1,$2)", [ownerB, jobA])).rejects.toMatchObject({ code: "42501" });
    await insert("authenticated", ownerB, "(owner_id) values ($1)", [ownerB]);
    await expect(as("authenticated", ownerB, "update public.portfolio_settings set pinned_job_id=$1", [jobA])).rejects.toMatchObject({ code: "42501" });
    await expect(as("authenticated", ownerB, "update public.portfolio_settings set owner_id=$1", [ownerA])).rejects.toMatchObject({ code: "42501" });
    await expect(as("authenticated", ownerB, "update public.portfolio_settings set updated_at=now()")).rejects.toMatchObject({ code: "42501" });
  });
  it("la base de datos exige coherencia: una fila por propietario, fotos del propio trabajo, dos fotos distintas", async () => {
    await insert("authenticated", ownerA, "(owner_id) values ($1)", [ownerA]);
    await expect(insert("authenticated", ownerA, "(owner_id) values ($1)", [ownerA])).rejects.toMatchObject({ code: "23505" });
    await expect(as("authenticated", ownerA, "update public.portfolio_settings set featured_job_id=$1, featured_before_id=$2, featured_after_id=$3", [jobA, mediaA, mediaB])).rejects.toMatchObject({ code: "23503" });
    await expect(as("authenticated", ownerA, "update public.portfolio_settings set featured_job_id=$1, featured_before_id=$2, featured_after_id=$2", [jobA, mediaA])).rejects.toMatchObject({ code: "23514" });
    await expect(as("authenticated", ownerA, "update public.portfolio_settings set featured_before_id=$1", [mediaA])).rejects.toMatchObject({ code: "23514" });
  });
  it("con varias filas manda la modificada más recientemente", async () => {
    await q("update public.jobs set is_public=true where id in ($1,$2)", [jobA, jobB]);
    await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${mediaA}.webp`]);
    await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobB}/${mediaB}.webp`]);
    await q("insert into public.portfolio_settings(owner_id,pinned_job_id,updated_at) values ($1,$2,'2026-10-01'),($3,$4,'2026-10-02')", [ownerA, jobA, ownerB, jobB]);
    expect((await listed())[0].id).toBe(jobB);
    await q("update public.portfolio_settings set pinned_job_id=$1 where owner_id=$2", [jobA, ownerA]);
    expect((await listed())[0].id).toBe(jobA);
  });
});

describe("contrato público", () => {
  it("list_public_jobs conserva exactamente su forma", async () => {
    await q("update public.jobs set is_public=true where id=$1", [jobA]);
    await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${mediaA}.webp`]);
    const rows = (await as("anon", null, "select * from public.list_public_jobs()")).rows;
    expect(Object.keys(rows[0]).sort()).toEqual(["description", "id", "job_date", "media", "name"]);
    expect(Object.keys((rows[0].media as object[])[0]).sort()).toEqual(["focal_x", "focal_y", "id", "path"]);
    expect(JSON.stringify(rows)).not.toMatch(/hidden|owner|pinned|featured/);
  });
  it("las funciones privadas no son invocables por anon ni authenticated; los RPC públicos sí", async () => {
    for (const fn of ["private.public_job_media($1)", "private.active_portfolio_settings()"]) {
      await expect(as("anon", null, `select * from ${fn}`, fn.includes("$1") ? [jobA] : [])).rejects.toMatchObject({ code: "42501" });
      await expect(as("authenticated", ownerA, `select * from ${fn}`, fn.includes("$1") ? [jobA] : [])).rejects.toMatchObject({ code: "42501" });
    }
    await expect(as("anon", null, "select * from public.get_featured_transformation()")).resolves.toBeDefined();
    await expect(as("authenticated", ownerA, "select * from public.get_featured_transformation()")).resolves.toBeDefined();
  });
});
