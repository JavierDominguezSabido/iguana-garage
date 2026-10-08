-- Horas de trabajo (privadas) y descripción (pública solo con is_public=true).
-- Aditiva: no altera policies, buckets ni grants existentes. Rollback manual (solo si no hay datos que conservar):
--   alter table public.jobs drop column work_hours, drop column description; y restaurar las dos funciones
--   de proyección de 20261006061544_gate3a_jobs_security.sql.
begin;

alter table public.jobs
  add column work_hours numeric(5,2) constraint jobs_work_hours_check check (work_hours is null or work_hours >= 0),
  add column description text constraint jobs_description_check
    check (description is null or (description = btrim(description) and char_length(description) between 1 and 500));
comment on column public.jobs.work_hours is 'PRIVADO. Horas con 2 decimales como máximo (0–999,99). Nunca forma parte de la proyección pública.';
comment on column public.jobs.description is 'Texto plano opcional. Público únicamente mediante list_public_jobs cuando is_public=true.';

-- Mismos permisos por columna que el resto de campos editables; anon sigue sin ningún privilegio sobre la tabla.
grant insert (work_hours, description) on public.jobs to authenticated;
grant update (work_hours, description) on public.jobs to authenticated;

-- La proyección pública solo añade description. work_hours, paint_code y owner_id permanecen fuera.
drop function public.list_public_jobs(integer, integer);
drop function private.public_jobs_projection(integer, integer);

create function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, coalesce((
    select jsonb_agg(jsonb_build_object('id', m.id, 'path', j.id::text || '/' || m.id::text || '.webp') order by m.position, m.id)
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
