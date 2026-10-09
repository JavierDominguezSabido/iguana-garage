-- Orden manual de los TRABAJOS en el muro (sustituye al fijado y a la fecha como criterio principal).
--  1) jobs.wall_position: posición del trabajo publicado en el muro (null = fuera del orden). Sin UNIQUE: los empates se
--     resuelven por fecha descendente y UUID, así reordenar es un único UPDATE sin colisiones.
--  2) Relleno que conserva el orden actual: el fijado primero y después por fecha (los privados quedan en null).
--  3) Trigger: un trabajo publicado sin posición entra ARRIBA del todo. Quien despublica de verdad pone la posición a null
--     (la app); la despublicación temporal del formulario no la toca, así que editar una errata no mueve el trabajo.
--  4) move_wall_job: mover un trabajo a una posición absoluta de forma atómica.
--  5) El muro público ordena por wall_position (misma firma y forma; ya no mira pinned_job_id).
-- Compatible con la app desplegada: no se toca pinned_job_id (se retira en una migración posterior, ver
-- 20261013120000_drop_pinned_job.sql). Mientras tanto el botón «Fijar arriba» de la app antigua no tiene efecto en el muro.
-- Rollback manual (solo se pierde el orden manual): restaurar private.public_jobs_projection de 20261011120000
--   (fijado primero y fecha), drop trigger jobs_wall_position on public.jobs; drop function private.assign_wall_position();
--   drop function public.move_wall_job(uuid, integer); alter table public.jobs drop column wall_position.
begin;

alter table public.jobs add column wall_position integer;
comment on column public.jobs.wall_position is 'Posición del trabajo publicado en el muro (0 = primero). null = no está en el orden (privado). Solo la gestión privada la escribe.';
grant update (wall_position) on public.jobs to authenticated;

-- Conserva el orden actual del muro al desplegar: fijado primero (si lo hay) y después fecha descendente / UUID.
update public.jobs j set wall_position = r.rn - 1
from (
  select p.id, row_number() over (partition by p.owner_id order by coalesce(p.id = s.pinned_job_id, false) desc, p.job_date desc, p.id) as rn
  from public.jobs p left join public.portfolio_settings s on s.owner_id = p.owner_id
  where p.is_public
) r
where j.id = r.id;

-- Un trabajo publicado sin posición entra arriba del todo (cualquier vía de publicación, también la app antigua).
create function private.assign_wall_position() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.is_public and new.wall_position is null then
    select coalesce(min(j.wall_position), 1) - 1 into new.wall_position
    from public.jobs j where j.owner_id = new.owner_id and j.is_public and j.id <> new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.assign_wall_position() from public, anon, authenticated;
create trigger jobs_wall_position before insert or update of is_public, wall_position on public.jobs
  for each row execute function private.assign_wall_position();

-- Mueve un trabajo publicado a la posición absoluta p_to (0 = primero) y renumera 0..n-1 en un único UPDATE.
-- SECURITY INVOKER: RLS por propietario. P0002 si no es suyo o no está publicado; 22023 si la posición no existe.
create function public.move_wall_job(p_job uuid, p_to integer) returns void
language plpgsql security invoker set search_path = '' as $$
declare owner uuid; ids uuid[]; total integer;
begin
  select j.owner_id into owner from public.jobs j where j.id = p_job and j.is_public for update;
  if not found then raise exception 'job not found' using errcode = 'P0002'; end if;
  perform 1 from public.jobs j where j.owner_id = owner and j.is_public order by j.id for update;
  select array_agg(j.id order by j.wall_position nulls last, j.job_date desc, j.id) into ids
  from public.jobs j where j.owner_id = owner and j.is_public;
  total := coalesce(array_length(ids, 1), 0);
  if p_to is null or p_to < 0 or p_to >= total then raise exception 'invalid position' using errcode = '22023'; end if;
  ids := array_remove(ids, p_job);
  ids := ids[1:p_to] || p_job || ids[p_to + 1:];
  update public.jobs j set wall_position = o.ord - 1 from unnest(ids) with ordinality as o(id, ord) where j.id = o.id;
end;
$$;
revoke all on function public.move_wall_job(uuid, integer) from public, anon, authenticated;
grant execute on function public.move_wall_job(uuid, integer) to authenticated;

-- Muro: mismo tipo de retorno. El orden manual manda; fecha y UUID solo desempatan. Sigue exigiendo una foto visible.
create or replace function private.public_jobs_projection(p_limit integer, p_offset integer)
returns table(id uuid, name text, job_date date, media jsonb, description text)
language sql stable security definer set search_path = '' as $$
  select j.id, j.name, j.job_date, pm.media, j.description
  from public.jobs j
  cross join lateral (select private.public_job_media(j.id) as media) pm
  where j.is_public and jsonb_array_length(pm.media) > 0
  order by j.wall_position nulls last, j.job_date desc, j.id
  limit greatest(1, least(coalesce(p_limit, 50), 100)) offset greatest(coalesce(p_offset, 0), 0);
$$;

commit;
