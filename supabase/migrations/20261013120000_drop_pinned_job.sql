-- Contracción: retira pinned_job_id (el fijado se sustituye por el orden manual, 20261012120000_wall_job_order).
-- NO aplicar hasta que la app que ya no usa el fijado esté desplegada y verificada, y con autorización propia.
-- DROP COLUMN falla si una política depende de la columna: se recrean antes sin ella.
-- Rollback: alter table public.portfolio_settings add column pinned_job_id uuid references public.jobs(id) on delete set null;
--   grant insert (pinned_job_id), update (pinned_job_id) on public.portfolio_settings to authenticated; y restaurar las políticas
--   de 20261010120000_portfolio_curation.sql. Los valores de pinned_job_id no se recuperan (están en la exportación previa).
begin;

drop policy settings_insert_owner on public.portfolio_settings;
drop policy settings_update_owner on public.portfolio_settings;
create policy settings_insert_owner on public.portfolio_settings for insert to authenticated with check (
  owner_id = (select auth.uid())
  and (featured_job_id is null or private.owns_job(featured_job_id))
);
create policy settings_update_owner on public.portfolio_settings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (featured_job_id is null or private.owns_job(featured_job_id))
  );

-- Los grants por columna y la clave foránea desaparecen con la columna.
alter table public.portfolio_settings drop column pinned_job_id;
comment on table public.portfolio_settings is 'Ajustes de la portada pública (uno por propietario): la transformación Antes/Después destacada. La proyección pública usa la fila modificada más recientemente.';

commit;
