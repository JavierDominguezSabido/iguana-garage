-- Control de la portada desde /app: fotos ocultas, trabajo fijado y transformación destacada.
-- Aditiva y compatible hacia atrás: list_public_jobs conserva firma y forma, y sin ajustes ni fotos
-- ocultas el comportamiento público no cambia (salvo la siembra de la transformación actual, abajo).
-- Depende de 20261009120000_media_focal_point (la proyección conserva focal_x/focal_y) y de
-- 20261007090238_responsive_private_derivatives (los cinco nombres de derivado).
-- Rollback manual (último recurso; ver supabase/README.md): restaurar las definiciones anteriores de
--   private.public_jobs_projection (20261009120000) y private.is_public_derivative (20261007090238),
--   drop function public.get_featured_transformation(), private.public_featured_transformation(),
--   private.public_job_media(uuid), private.active_portfolio_settings(); drop table public.portfolio_settings;
--   alter table public.job_media drop constraint job_media_job_id_id_key, drop column hidden_from_home.
--   ATENCIÓN: quitar hidden_from_home vuelve a publicar las fotos que el propietario ocultó.
begin;

-- Foto oculta de la home: sigue en la gestión privada, pero no sale en la proyección ni es descargable por anon.
alter table public.job_media add column hidden_from_home boolean not null default false;
comment on column public.job_media.hidden_from_home is 'true = la foto no aparece en la home ni se puede descargar públicamente. Solo la gestión privada la ve.';
-- Necesario para que la transformación destacada solo pueda referenciar fotos de su propio trabajo.
alter table public.job_media add constraint job_media_job_id_id_key unique (job_id, id);
grant update (hidden_from_home) on public.job_media to authenticated;

-- Una fila por propietario: trabajo fijado arriba del muro y transformación Antes/Después de la portada.
create table public.portfolio_settings (
  owner_id uuid primary key references auth.users(id) on delete restrict,
  pinned_job_id uuid references public.jobs(id) on delete set null,
  featured_job_id uuid references public.jobs(id) on delete set null,
  featured_before_id uuid,
  featured_after_id uuid,
  updated_at timestamptz not null default now(),
  -- MATCH SIMPLE: sin trabajo o sin foto no se comprueba. Borrar una foto solo anula su columna.
  constraint portfolio_settings_before_fk foreign key (featured_job_id, featured_before_id)
    references public.job_media(job_id, id) on delete set null (featured_before_id),
  constraint portfolio_settings_after_fk foreign key (featured_job_id, featured_after_id)
    references public.job_media(job_id, id) on delete set null (featured_after_id),
  constraint portfolio_settings_pair_check check (featured_before_id is null or featured_after_id is null or featured_before_id <> featured_after_id),
  -- Las fotos solo se pueden referenciar junto con su trabajo (así la FK compuesta siempre se comprueba).
  constraint portfolio_settings_job_check check (featured_job_id is not null or (featured_before_id is null and featured_after_id is null))
);
comment on table public.portfolio_settings is 'Ajustes de la portada pública (uno por propietario). La proyección pública usa la fila modificada más recientemente.';
create trigger portfolio_settings_updated_at before update on public.portfolio_settings for each row execute function private.touch_job_updated_at();

alter table public.portfolio_settings enable row level security;
revoke all on public.portfolio_settings from public, anon, authenticated;
grant select, delete on public.portfolio_settings to authenticated;
grant insert (owner_id, pinned_job_id, featured_job_id, featured_before_id, featured_after_id) on public.portfolio_settings to authenticated;
grant update (pinned_job_id, featured_job_id, featured_before_id, featured_after_id) on public.portfolio_settings to authenticated;

create policy settings_select_owner on public.portfolio_settings for select to authenticated using (owner_id = (select auth.uid()));
create policy settings_insert_owner on public.portfolio_settings for insert to authenticated with check (
  owner_id = (select auth.uid())
  and (pinned_job_id is null or private.owns_job(pinned_job_id))
  and (featured_job_id is null or private.owns_job(featured_job_id))
);
create policy settings_update_owner on public.portfolio_settings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (pinned_job_id is null or private.owns_job(pinned_job_id))
    and (featured_job_id is null or private.owns_job(featured_job_id))
  );
create policy settings_delete_owner on public.portfolio_settings for delete to authenticated using (owner_id = (select auth.uid()));

-- Lectura pública: funciones SECURITY DEFINER privadas (esquema no expuesto), search_path vacío y nombres cualificados.
-- La home es anónima: usa la fila de ajustes modificada más recientemente (hoy hay un único propietario).
create function private.active_portfolio_settings() returns setof public.portfolio_settings
language sql stable security definer set search_path = '' as $$
  select s.* from public.portfolio_settings s order by s.updated_at desc, s.owner_id limit 1;
$$;
revoke all on function private.active_portfolio_settings() from public, anon, authenticated;

-- Fotos visibles de un trabajo: con derivado existente y no ocultas. No comprueba la publicación: solo la llaman
-- las proyecciones públicas, que ya filtran por is_public.
create function private.public_job_media(p_job uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'path', m.job_id::text || '/' || m.id::text || '.webp',
    'focal_x', m.focal_x, 'focal_y', m.focal_y) order by m.position, m.id), '[]'::jsonb)
  from public.job_media m
  where m.job_id = p_job and not m.hidden_from_home and exists (
    select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives' and o.name = m.job_id::text || '/' || m.id::text || '.webp'
  );
$$;
revoke all on function private.public_job_media(uuid) from public, anon, authenticated;

-- Mismo tipo de retorno que antes: CREATE OR REPLACE conserva ownership y grants. El fijado va primero.
create or replace function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, private.public_job_media(j.id), j.description
  from public.jobs j where j.is_public
  order by coalesce(j.id = (select s.pinned_job_id from private.active_portfolio_settings() s), false) desc, j.job_date desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Transformación destacada: solo con el trabajo publicado y ambas fotos visibles. En otro caso, ninguna fila.
create function private.public_featured_transformation()
returns table(id uuid, name text, job_date date, media jsonb, description text, before_id uuid, after_id uuid)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, pm.media, j.description, s.featured_before_id, s.featured_after_id
  from private.active_portfolio_settings() s
  join public.jobs j on j.id = s.featured_job_id
  cross join lateral (select private.public_job_media(j.id) as media) pm
  where j.is_public and s.featured_before_id is not null and s.featured_after_id is not null
    and s.featured_before_id <> s.featured_after_id
    and pm.media @> jsonb_build_array(jsonb_build_object('id', s.featured_before_id))
    and pm.media @> jsonb_build_array(jsonb_build_object('id', s.featured_after_id));
$$;
revoke all on function private.public_featured_transformation() from public, anon, authenticated;
grant execute on function private.public_featured_transformation() to anon, authenticated;

create function public.get_featured_transformation()
returns table(id uuid, name text, job_date date, media jsonb, description text, before_id uuid, after_id uuid)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.name, p.job_date, p.media, p.description, p.before_id, p.after_id from private.public_featured_transformation() p;
$$;
revoke all on function public.get_featured_transformation() from public, anon, authenticated;
grant execute on function public.get_featured_transformation() to anon, authenticated;

-- Una foto oculta deja de ser descargable por anon (los cinco nombres exactos no cambian). El propietario conserva
-- el acceso mediante private.owns_derivative.
create or replace function private.is_public_derivative(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.jobs j join public.job_media m on m.job_id=j.id
    where j.is_public and not m.hidden_from_home and object_name in (
      j.id::text || '/' || m.id::text || '.webp',
      j.id::text || '/' || m.id::text || '/320.webp',
      j.id::text || '/' || m.id::text || '/390.webp',
      j.id::text || '/' || m.id::text || '/640.webp',
      j.id::text || '/' || m.id::text || '/768.webp'
    ));
$$;

-- Siembra: la transformación que hasta ahora estaba fija en el código (Suzuki). Idempotente; no hace nada si esos
-- identificadores no existen (bases de pruebas o locales).
insert into public.portfolio_settings (owner_id, featured_job_id, featured_before_id, featured_after_id)
select j.owner_id, j.id, b.id, a.id
from public.jobs j
join public.job_media b on b.job_id = j.id and b.id = '504d65a0-39e0-4e22-96d5-ce924d6bf1b6'
join public.job_media a on a.job_id = j.id and a.id = '48ccc1f5-1f4a-42ca-a11a-1d32ebb8a338'
where j.id = '8f507ad1-9bec-400d-8663-9a516545ffc9'
on conflict (owner_id) do nothing;

commit;
