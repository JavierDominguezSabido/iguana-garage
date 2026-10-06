-- Ejecutar exclusivamente en Iguana Garage de desarrollo. Todos los fixtures se revierten.
-- Contextos de roles/JWT reales de PostgreSQL; no prueba inicio de sesión ni bytes del API Storage.
begin;
set local plpgsql.check_asserts = on;
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111', 'gate3a-a@example.invalid'),
 ('44444444-4444-4444-8444-444444444444', 'gate3a-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
insert into public.jobs (id, owner_id, name, job_date, paint_code) values
 ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Trabajo A', '2026-10-06', 'PRIVATE-PAINT');
do $$ begin
  assert (select count(*) = 1 from public.jobs), 'A debe leer su trabajo';
  assert (select not is_public from public.jobs limit 1), 'Privado por defecto';
  update public.jobs set name = 'Trabajo A editado' where id = '22222222-2222-4222-8222-222222222222';
  assert (select name = 'Trabajo A editado' from public.jobs limit 1), 'A debe editar su trabajo';
  begin
    insert into public.jobs (owner_id, name, job_date) values ('44444444-4444-4444-8444-444444444444', 'Suplantación', '2026-10-06');
    raise exception 'Insertar con otro propietario no fue denegado';
  exception when insufficient_privilege then null; end;
  begin
    update public.jobs set owner_id = '44444444-4444-4444-8444-444444444444';
    raise exception 'Transferir propietario no fue denegado';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.jobs (owner_id, name, job_date) values ('11111111-1111-4111-8111-111111111111', ' ', '2026-10-06');
    raise exception 'Nombre vacío aceptado';
  exception when check_violation then null; end;
end $$;
insert into public.job_media (id, job_id, storage_path, mime_type, position, width, height, byte_size) values
 ('33333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.png', 'image/png', 0, 1, 1, 100);
do $$ begin
  assert (select count(*) = 1 from public.job_media), 'A debe leer su medio';
  update public.job_media set position = 1;
  assert (select position = 1 from public.job_media limit 1), 'A debe editar su medio';
  begin
    update public.job_media set position = -1;
    raise exception 'Posición negativa aceptada';
  exception when check_violation then null; end;
  begin
    update public.job_media set byte_size = 0;
    raise exception 'Tamaño cero aceptado';
  exception when check_violation then null; end;
  begin
    update public.job_media set width = 0;
    raise exception 'Dimensión cero aceptada';
  exception when check_violation then null; end;
end $$;
insert into storage.objects (bucket_id, name) values
 ('job-originals', '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.png'),
 ('portfolio-derivatives', '22222222-2222-4222-8222-222222222222/33333333-3333-4333-8333-333333333333.webp');

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
do $$ declare affected integer; begin
  assert (select count(*) = 0 from public.jobs), 'B no debe leer trabajos de A';
  assert (select count(*) = 0 from public.job_media), 'B no debe leer medios de A';
  update public.jobs set name = 'Ataque'; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar trabajos de A';
  delete from public.jobs; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe eliminar trabajos de A';
  update public.job_media set position = 3; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar medios de A';
  delete from public.job_media; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe eliminar medios de A';
  begin
    insert into public.job_media (job_id, storage_path, mime_type, position) values
      ('22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444444/22222222-2222-4222-8222-222222222222/66666666-6666-4666-8666-666666666666.png', 'image/png', 4);
    raise exception 'B pudo asociar un medio al trabajo de A';
  exception when insufficient_privilege then null; end;
  assert (select count(*) = 0 from storage.objects where bucket_id = 'job-originals'), 'B no debe leer originales de A';
  begin
    insert into storage.objects (bucket_id, name) values ('job-originals', '44444444-4444-4444-8444-444444444444/22222222-2222-4222-8222-222222222222/66666666-6666-4666-8666-666666666666.png');
    raise exception 'B pudo subir dentro del trabajo de A';
  exception when insufficient_privilege then null; end;
end $$;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  begin perform 1 from public.jobs; raise exception 'Lectura anónima de jobs permitida';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.job_media; raise exception 'Lectura anónima de job_media permitida';
  exception when insufficient_privilege then null; end;
  assert (select count(*) = 0 from public.list_public_jobs()), 'Trabajo privado apareció públicamente';
  assert (select count(*) = 0 from storage.objects where bucket_id = 'job-originals'), 'Anónimo pudo leer originales';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.jobs set is_public = true where id = '22222222-2222-4222-8222-222222222222';
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ declare result jsonb; begin
  select to_jsonb(j) into result from public.list_public_jobs() j;
  assert result->>'id' = '22222222-2222-4222-8222-222222222222', 'Trabajo publicado ausente';
  assert not result ? 'owner_id' and not result ? 'paint_code' and not result ? 'created_at', 'Contrato público reveló campos privados';
  assert jsonb_array_length(result->'media') = 1, 'Derivado autorizado ausente';
  assert not (result->'media'->0) ? 'storage_path', 'Se expuso ruta de original';
  assert (select count(*) = 0 from storage.objects where bucket_id = 'job-originals'), 'Publicar abrió originales';
end $$;
-- Cada operación se comprueba con el mismo GUC que utiliza la versión instalada de Storage.
select set_config('storage.operation', 'object.list', true);
do $$ begin assert (select count(*) = 0 from storage.objects where bucket_id = 'portfolio-derivatives'), 'Enumeración anónima permitida'; end $$;
select set_config('storage.operation', 'object.get_authenticated', true);
do $$ begin assert (select count(*) = 1 from storage.objects where bucket_id = 'portfolio-derivatives'), 'Descarga del derivado publicada denegada'; end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.jobs set is_public = false;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  assert (select count(*) = 0 from public.list_public_jobs()), 'Despublicación no retiró el contrato';
  assert (select count(*) = 0 from storage.objects where bucket_id = 'portfolio-derivatives'), 'Despublicación no revocó el derivado';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ declare affected integer; begin
  -- El borrado de bytes/objetos se comprueba en la suite HTTP, no eludiendo storage.protect_delete().
  delete from public.job_media; get diagnostics affected = row_count;
  assert affected = 1, 'A debe eliminar su medio';
  delete from public.jobs; get diagnostics affected = row_count;
  assert affected = 1, 'A debe eliminar su trabajo';
end $$;
rollback;
select 'PASS' as authorization_assertions, 'fixtures rolled back' as cleanup;
