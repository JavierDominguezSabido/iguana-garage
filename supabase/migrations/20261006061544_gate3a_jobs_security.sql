begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 200),
  job_date date not null check (job_date between date '0001-01-01' and date '9999-12-31'),
  paint_code text check (paint_code is null or (paint_code = btrim(paint_code) and char_length(paint_code) between 1 and 80)),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_owner_date_idx on public.jobs(owner_id, job_date desc, id);
create index jobs_public_date_idx on public.jobs(job_date desc, id) where is_public;

create table public.job_media (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete restrict,
  storage_path text unique not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  position integer not null check (position >= 0),
  width integer check (width > 0),
  height integer check (height > 0),
  byte_size bigint check (byte_size between 1 and 10485760),
  created_at timestamptz not null default now(),
  unique (job_id, position),
  constraint media_path_shape check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$')
);

create function private.touch_job_updated_at() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = statement_timestamp(); return new; end;
$$;
revoke all on function private.touch_job_updated_at() from public, anon, authenticated;
create trigger jobs_updated_at before update on public.jobs for each row execute function private.touch_job_updated_at();

alter table public.jobs enable row level security;
alter table public.job_media enable row level security;
revoke all on public.jobs, public.job_media from public, anon, authenticated;
grant select, delete on public.jobs, public.job_media to authenticated;
grant insert (id, owner_id, name, job_date, paint_code, is_public) on public.jobs to authenticated;
grant update (name, job_date, paint_code, is_public) on public.jobs to authenticated;
grant insert (id, job_id, storage_path, mime_type, position, width, height, byte_size) on public.job_media to authenticated;
grant update (job_id, storage_path, mime_type, position, width, height, byte_size) on public.job_media to authenticated;
grant all on public.jobs, public.job_media to service_role;

create policy jobs_select_owner on public.jobs for select to authenticated using (owner_id = (select auth.uid()));
create policy jobs_insert_owner on public.jobs for insert to authenticated with check (owner_id = (select auth.uid()));
create policy jobs_update_owner on public.jobs for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy jobs_delete_owner on public.jobs for delete to authenticated using (owner_id = (select auth.uid()));

create function private.owns_job(target_job uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.jobs j where j.id = target_job and j.owner_id = (select auth.uid()));
$$;
revoke all on function private.owns_job(uuid) from public, anon, authenticated;
grant execute on function private.owns_job(uuid) to authenticated;

create policy media_select_owner on public.job_media for select to authenticated using (private.owns_job(job_id));
create policy media_insert_owner on public.job_media for insert to authenticated with check (
  private.owns_job(job_id) and storage_path = (select auth.uid())::text || '/' || job_id::text || '/' || id::text ||
    case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'image/webp' then '.webp' end
);
create policy media_update_owner on public.job_media for update to authenticated
  using (private.owns_job(job_id)) with check (
    private.owns_job(job_id) and storage_path = (select auth.uid())::text || '/' || job_id::text || '/' || id::text ||
      case mime_type when 'image/jpeg' then '.jpg' when 'image/png' then '.png' when 'image/webp' then '.webp' end
  );
create policy media_delete_owner on public.job_media for delete to authenticated using (private.owns_job(job_id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
 ('job-originals', 'job-originals', false, 10485760, array['image/jpeg','image/png','image/webp']),
 ('portfolio-derivatives', 'portfolio-derivatives', false, 5242880, array['image/webp']);

create function private.owns_original_path(object_name text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and split_part(object_name, '/', 1) = (select auth.uid())::text;
$$;
create function private.can_upload_original(object_name text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.owns_original_path(object_name) and exists (
    select 1 from public.jobs j where j.id::text = split_part(object_name, '/', 2) and j.owner_id = (select auth.uid())
  );
$$;
create function private.owns_derivative(object_name text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists (select 1 from public.job_media m join public.jobs j on j.id = m.job_id
    where object_name = j.id::text || '/' || m.id::text || '.webp' and j.owner_id = (select auth.uid()));
$$;
revoke all on function private.owns_original_path(text), private.can_upload_original(text), private.owns_derivative(text) from public, anon, authenticated;
grant execute on function private.owns_original_path(text), private.can_upload_original(text), private.owns_derivative(text) to authenticated;

create policy originals_insert_owner on storage.objects for insert to authenticated
  with check (bucket_id = 'job-originals' and private.can_upload_original(name));
create policy originals_select_owner on storage.objects for select to authenticated
  using (bucket_id = 'job-originals' and private.owns_original_path(name));
create policy originals_delete_owner on storage.objects for delete to authenticated
  using (bucket_id = 'job-originals' and private.owns_original_path(name));
create policy derivatives_insert_owner on storage.objects for insert to authenticated
  with check (bucket_id = 'portfolio-derivatives' and private.owns_derivative(name));
create policy derivatives_select_owner on storage.objects for select to authenticated
  using (bucket_id = 'portfolio-derivatives' and private.owns_derivative(name));
create policy derivatives_delete_owner on storage.objects for delete to authenticated
  using (bucket_id = 'portfolio-derivatives' and private.owns_derivative(name));
-- Sin UPDATE: objetos inmutables, subida con upsert:false. Reemplazar requiere borrar/subir explícitamente.

-- Excepción deliberada y acotada a RLS: proyección pública, nunca usada para gestión.
-- SECURITY DEFINER queda en un esquema NO expuesto; nombres cualificados, sin SQL dinámico.
create function private.is_public_derivative(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.jobs j join public.job_media m on m.job_id = j.id
    where j.is_public and object_name = j.id::text || '/' || m.id::text || '.webp');
$$;
revoke all on function private.is_public_derivative(text) from public, anon, authenticated;
grant execute on function private.is_public_derivative(text) to anon, authenticated;
create policy derivatives_download_public on storage.objects for select to anon, authenticated using (
  bucket_id = 'portfolio-derivatives'
  and storage.allow_any_operation(array['object.get_authenticated', 'object.get_authenticated_info'])
  and private.is_public_derivative(name)
);

create function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'path', j.id::text || '/' || m.id::text || '.webp') order by m.position, m.id)
    from public.job_media m where m.job_id = j.id and exists (
      select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives' and o.name = j.id::text || '/' || m.id::text || '.webp'
    )
  ), '[]'::jsonb)
  from public.jobs j where j.is_public
  order by j.job_date desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function private.public_jobs_projection(integer, integer) from public, anon, authenticated;
grant execute on function private.public_jobs_projection(integer, integer) to anon, authenticated;
create function public.list_public_jobs(p_limit integer default 50, p_offset integer default 0)
returns table(id uuid, name text, job_date date, media jsonb)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.name, p.job_date, p.media from private.public_jobs_projection(p_limit, p_offset) p;
$$;
revoke all on function public.list_public_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.list_public_jobs(integer, integer) to anon, authenticated;
commit;
