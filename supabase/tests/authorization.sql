-- Ejecutar exclusivamente en Iguana Garage de desarrollo. Todos los fixtures se revierten.
-- Contextos de roles/JWT reales de PostgreSQL; no prueba inicio de sesión ni bytes del API Storage.
begin;
set local plpgsql.check_asserts = on;
insert into auth.users (id, email) values
 ('11111111-1111-4111-8111-111111111111', 'gate3a-a@example.invalid'),
 ('44444444-4444-4444-8444-444444444444', 'gate3a-b@example.invalid');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
insert into public.jobs (id, owner_id, name, job_date, paint_code, work_hours, description) values
 ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Trabajo A', '2026-10-06', 'PRIVATE-PAINT', 12.5, 'Descripción pública de prueba.');
do $$ begin
  assert (select count(*) = 1 from public.jobs), 'A debe leer su trabajo';
  assert (select not is_public from public.jobs limit 1), 'Privado por defecto';
  update public.jobs set name = 'Trabajo A editado' where id = '22222222-2222-4222-8222-222222222222';
  assert (select name = 'Trabajo A editado' from public.jobs limit 1), 'A debe editar su trabajo';
  assert (select work_hours = 12.5 and description = 'Descripción pública de prueba.' from public.jobs limit 1), 'A debe leer horas y descripción';
  update public.jobs set work_hours = 8.25 where id = '22222222-2222-4222-8222-222222222222';
  assert (select work_hours = 8.25 from public.jobs limit 1), 'A debe editar las horas';
  begin update public.jobs set work_hours = -1; raise exception 'Horas negativas aceptadas';
  exception when check_violation then null; end;
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
  assert (select focal_x = 50 and focal_y = 50 from public.job_media limit 1), 'Punto focal por defecto: centro';
  update public.job_media set focal_x = 20, focal_y = 80;
  assert (select focal_x = 20 and focal_y = 80 from public.job_media limit 1), 'A debe editar el punto focal';
  begin update public.job_media set focal_x = 101; raise exception 'Punto focal fuera de rango aceptado';
  exception when check_violation then null; end;
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
  update public.jobs set work_hours = 99, description = 'Ataque'; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar horas ni descripción de A';
  delete from public.jobs; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe eliminar trabajos de A';
  update public.job_media set position = 3; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar medios de A';
  update public.job_media set focal_x = 1; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar el punto focal de A';
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
  begin perform work_hours from public.jobs; raise exception 'Lectura anónima de horas permitida';
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
  assert not result ? 'owner_id' and not result ? 'paint_code' and not result ? 'created_at' and not result ? 'work_hours', 'Contrato público reveló campos privados';
  assert result->>'description' = 'Descripción pública de prueba.', 'Descripción pública ausente';
  assert jsonb_array_length(result->'media') = 1, 'Derivado autorizado ausente';
  assert not (result->'media'->0) ? 'storage_path', 'Se expuso ruta de original';
  assert (result->'media'->0->>'focal_x')::int = 20 and (result->'media'->0->>'focal_y')::int = 80, 'Punto focal público ausente';
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

-- Portada: trabajo fijado, fotos ocultas y transformación destacada.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.jobs set is_public = true where id = '22222222-2222-4222-8222-222222222222';
insert into public.job_media (id, job_id, storage_path, mime_type, position, width, height, byte_size) values
 ('77777777-7777-4777-8777-777777777777', '22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/77777777-7777-4777-8777-777777777777.png', 'image/png', 2, 1, 1, 100);
insert into storage.objects (bucket_id, name) values ('portfolio-derivatives', '22222222-2222-4222-8222-222222222222/77777777-7777-4777-8777-777777777777.webp');
insert into public.portfolio_settings (owner_id, pinned_job_id, featured_job_id, featured_before_id, featured_after_id) values
 ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333', '77777777-7777-4777-8777-777777777777');
do $$ begin
  assert (select count(*) = 1 from public.portfolio_settings), 'A debe leer sus ajustes de portada';
  begin update public.portfolio_settings set featured_after_id = featured_before_id; raise exception 'Antes y Después iguales aceptados';
  exception when check_violation then null; end;
  begin update public.portfolio_settings set owner_id = '44444444-4444-4444-8444-444444444444'; raise exception 'Transferir ajustes aceptado';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}', true);
do $$ declare affected integer; begin
  assert (select count(*) = 0 from public.portfolio_settings), 'B no debe leer los ajustes de A';
  update public.portfolio_settings set pinned_job_id = null; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe modificar los ajustes de A';
  delete from public.portfolio_settings; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe eliminar los ajustes de A';
  begin insert into public.portfolio_settings (owner_id, pinned_job_id) values ('44444444-4444-4444-8444-444444444444', '22222222-2222-4222-8222-222222222222'); raise exception 'B pudo fijar el trabajo de A';
  exception when insufficient_privilege then null; end;
  update public.job_media set hidden_from_home = true; get diagnostics affected = row_count;
  assert affected = 0, 'B no debe ocultar fotos de A';
end $$;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select set_config('storage.operation', 'object.get_authenticated', true);
do $$ begin
  begin perform 1 from public.portfolio_settings; raise exception 'Lectura anónima de ajustes permitida';
  exception when insufficient_privilege then null; end;
  assert (select id = '22222222-2222-4222-8222-222222222222' from public.list_public_jobs() limit 1), 'Trabajo fijado ausente';
  assert (select before_id = '33333333-3333-4333-8333-333333333333' and after_id = '77777777-7777-4777-8777-777777777777' and jsonb_array_length(media) = 2 from public.get_featured_transformation()), 'Transformación destacada ausente';
  assert not (select to_jsonb(f) ? 'owner_id' from public.get_featured_transformation() f), 'Transformación reveló el propietario';
  assert (select count(*) = 2 from storage.objects where bucket_id = 'portfolio-derivatives'), 'Derivados publicados no descargables';
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.job_media set hidden_from_home = true where id = '77777777-7777-4777-8777-777777777777';
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  assert (select count(*) = 0 from public.get_featured_transformation()), 'Foto oculta siguió en la portada';
  assert (select jsonb_array_length(media) = 1 from public.list_public_jobs() limit 1), 'Foto oculta siguió en la proyección';
  assert (select count(*) = 1 from storage.objects where bucket_id = 'portfolio-derivatives'), 'Foto oculta siguió descargable';
end $$;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
update public.job_media set hidden_from_home = false where id = '77777777-7777-4777-8777-777777777777';
update public.jobs set is_public = false;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin assert (select count(*) = 0 from public.get_featured_transformation()), 'Despublicar no retiró la portada'; end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
do $$ declare affected integer; begin
  -- El borrado de bytes/objetos se comprueba en la suite HTTP, no eludiendo storage.protect_delete().
  delete from public.job_media; get diagnostics affected = row_count;
  assert affected = 2, 'A debe eliminar sus medios';
  delete from public.jobs; get diagnostics affected = row_count;
  assert affected = 1, 'A debe eliminar su trabajo';
end $$;
rollback;
select 'PASS' as authorization_assertions, 'fixtures rolled back' as cleanup;
