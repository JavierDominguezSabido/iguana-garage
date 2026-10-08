-- Punto focal por fotografía (object-position del recorte cover del portfolio). No altera originales, master ni sidecars.
-- Depende de 20261008120000_job_hours_description (la proyección conserva description).
-- Rollback manual: alter table public.job_media drop column focal_x, drop column focal_y; y restaurar la proyección anterior.
begin;

-- Porcentaje entero 0–100; 50/50 = centro = comportamiento previo de object-fit: cover.
alter table public.job_media
  add column focal_x smallint not null default 50 constraint job_media_focal_x_check check (focal_x between 0 and 100),
  add column focal_y smallint not null default 50 constraint job_media_focal_y_check check (focal_y between 0 and 100);
comment on column public.job_media.focal_x is 'Punto focal horizontal en % (0 izquierda, 100 derecha). Solo presentación.';
comment on column public.job_media.focal_y is 'Punto focal vertical en % (0 arriba, 100 abajo). Solo presentación.';

-- Mismo modelo de permisos por columna: solo el propietario (RLS media_update_owner) lo edita.
grant update (focal_x, focal_y) on public.job_media to authenticated;

-- La proyección pública añade focal_x/focal_y únicamente a medios de trabajos publicados con derivado existente.
drop function public.list_public_jobs(integer, integer);
drop function private.public_jobs_projection(integer, integer);

create function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'path', j.id::text || '/' || m.id::text || '.webp',
      'focal_x', m.focal_x, 'focal_y', m.focal_y) order by m.position, m.id)
    from public.job_media m where m.job_id = j.id and exists (
      select 1 from storage.objects o where o.bucket_id = 'portfolio-derivatives' and o.name = j.id::text || '/' || m.id::text || '.webp'
    )
  ), '[]'::jsonb), j.description
  from public.jobs j where j.is_public
  order by j.job_date desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
$$;
revoke all on function private.public_jobs_projection(integer, integer) from public, anon, authenticated;
grant execute on function private.public_jobs_projection(integer, integer) to anon, authenticated;

create function public.list_public_jobs(p_limit integer default 50, p_offset integer default 0)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security invoker set search_path = '' as $$
  select p.id, p.name, p.job_date, p.media, p.description from private.public_jobs_projection(p_limit, p_offset) p;
$$;
revoke all on function public.list_public_jobs(integer, integer) from public, anon, authenticated;
grant execute on function public.list_public_jobs(integer, integer) to anon, authenticated;

commit;
