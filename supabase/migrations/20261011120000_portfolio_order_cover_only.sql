-- Orden de fotos y fotos «solo para la portada».
--  1) reorder_job_media: reordenar las fotos de un trabajo de forma atómica (UNIQUE (job_id, position) no es diferible).
--  2) hidden_from_home pasa a significar «no sale en el muro». Una foto oculta SÍ puede ser el Antes o el Después de la
--     portada: se ve en el comparador y en su visor, y solo es descargable por anon mientras esté destacada (par válido).
--  3) Un trabajo publicado sin ninguna foto visible en el muro deja de listarse (sin banda).
-- Compatible hacia atrás: list_public_jobs y get_featured_transformation conservan firma y forma; el nombre de la columna
-- hidden_from_home no cambia. Depende de 20261010120000_portfolio_curation.
-- Rollback manual (último recurso; solo vuelve a lo más privado, no toca datos): restaurar las definiciones de
--   private.public_job_media(uuid), private.public_jobs_projection, private.public_featured_transformation y
--   private.is_public_derivative de 20261010120000_portfolio_curation.sql;
--   drop function public.reorder_job_media(uuid, uuid[]); drop function private.featured_pair().
begin;

-- Reordenar atómicamente. SECURITY INVOKER: RLS por propietario (un trabajo ajeno no se ve ni se bloquea).
-- Dos pasadas dentro de la misma transacción: primero se desplazan todas las posiciones por encima del máximo (sin
-- colisiones con UNIQUE (job_id, position)) y después se asigna 0..n-1 según el array. Si algo falla, todo se revierte.
-- El array debe contener exactamente las fotos del trabajo, una vez cada una; si no (p. ej. subida concurrente), error 22023.
create function public.reorder_job_media(p_job uuid, p_order uuid[]) returns void
language plpgsql security invoker set search_path = '' as $$
declare total integer; shift integer;
begin
  perform 1 from public.jobs j where j.id = p_job for update;
  if not found then raise exception 'job not found' using errcode = 'P0002'; end if;
  select count(*) into total from public.job_media m where m.job_id = p_job;
  if p_order is null or coalesce(array_length(p_order, 1), 0) <> total
     or (select count(distinct x) from unnest(p_order) x) <> total
     or exists (select 1 from unnest(p_order) x where not exists (select 1 from public.job_media m where m.id = x and m.job_id = p_job)) then
    raise exception 'invalid order' using errcode = '22023';
  end if;
  if total = 0 then return; end if;
  select max(m.position) + 1 into shift from public.job_media m where m.job_id = p_job;
  update public.job_media m set position = m.position + shift where m.job_id = p_job;
  update public.job_media m set position = o.ord - 1
    from unnest(p_order) with ordinality as o(id, ord) where m.id = o.id and m.job_id = p_job;
end;
$$;
revoke all on function public.reorder_job_media(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_job_media(uuid, uuid[]) to authenticated;

-- Fuente única de verdad de la portada válida: trabajo publicado, dos fotos distintas y con derivado (master).
-- La usan la proyección y la política de descarga, para que no puedan discrepar. Ninguna fila = portada solo con título.
create function private.featured_pair() returns table(job_id uuid, before_id uuid, after_id uuid)
language sql stable security definer set search_path = '' as $$
  select s.featured_job_id, s.featured_before_id, s.featured_after_id
  from private.active_portfolio_settings() s
  join public.jobs j on j.id = s.featured_job_id and j.is_public
  where s.featured_before_id is not null and s.featured_after_id is not null and s.featured_before_id <> s.featured_after_id
    and exists (select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives'
      and o.name = s.featured_job_id::text || '/' || s.featured_before_id::text || '.webp')
    and exists (select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives'
      and o.name = s.featured_job_id::text || '/' || s.featured_after_id::text || '.webp');
$$;
revoke all on function private.featured_pair() from public, anon, authenticated;

-- Fotos públicas de un trabajo, por posición: con derivado y no ocultas, más las de p_include (las de la portada).
drop function private.public_job_media(uuid);
create function private.public_job_media(p_job uuid, p_include uuid[] default '{}') returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'path', m.job_id::text || '/' || m.id::text || '.webp',
    'focal_x', m.focal_x, 'focal_y', m.focal_y) order by m.position, m.id), '[]'::jsonb)
  from public.job_media m
  where m.job_id = p_job and (not m.hidden_from_home or m.id = any(p_include)) and exists (
    select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives' and o.name = m.job_id::text || '/' || m.id::text || '.webp'
  );
$$;
revoke all on function private.public_job_media(uuid, uuid[]) from public, anon, authenticated;

-- Muro: mismo tipo de retorno. Sin ninguna foto visible no hay banda (el filtro va en el mismo WHERE: limit/offset coherentes).
create or replace function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, pm.media, j.description
  from public.jobs j
  cross join lateral (select private.public_job_media(j.id) as media) pm
  where j.is_public and jsonb_array_length(pm.media) > 0
  order by coalesce(j.id = (select s.pinned_job_id from private.active_portfolio_settings() s), false) desc, j.job_date desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Portada: las fotos visibles más el Antes y el Después aunque estén ocultas del muro.
create or replace function private.public_featured_transformation()
returns table(id uuid, name text, job_date date, media jsonb, description text, before_id uuid, after_id uuid)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, pm.media, j.description, f.before_id, f.after_id
  from private.featured_pair() f
  join public.jobs j on j.id = f.job_id
  cross join lateral (select private.public_job_media(j.id, array[f.before_id, f.after_id]) as media) pm;
$$;

-- Descarga pública (los cinco nombres exactos no cambian): trabajo publicado y (foto no oculta o foto de la portada válida).
-- Se reevalúa en cada petición: quitar de portada, sustituir, despublicar o borrar la foto la deniega al instante.
create or replace function private.is_public_derivative(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.jobs j join public.job_media m on m.job_id = j.id
    where j.is_public and object_name in (
      j.id::text || '/' || m.id::text || '.webp',
      j.id::text || '/' || m.id::text || '/320.webp',
      j.id::text || '/' || m.id::text || '/390.webp',
      j.id::text || '/' || m.id::text || '/640.webp',
      j.id::text || '/' || m.id::text || '/768.webp'
    ) and (not m.hidden_from_home or exists (
      select 1 from private.featured_pair() f where f.job_id = j.id and m.id in (f.before_id, f.after_id))));
$$;

commit;
