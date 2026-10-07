begin;
-- Mismo propietario/publicación, buckets, grants y operaciones. Solo cinco
-- nombres exactos por medio; conservar el master mantiene la proyección legacy.
create or replace function private.owns_derivative(object_name text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.job_media m join public.jobs j on j.id=m.job_id
    where j.owner_id=(select auth.uid()) and object_name in (
      j.id::text || '/' || m.id::text || '.webp',
      j.id::text || '/' || m.id::text || '/320.webp',
      j.id::text || '/' || m.id::text || '/390.webp',
      j.id::text || '/' || m.id::text || '/640.webp',
      j.id::text || '/' || m.id::text || '/768.webp'
    ));
$$;
create or replace function private.is_public_derivative(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.jobs j join public.job_media m on m.job_id=j.id
    where j.is_public and object_name in (
      j.id::text || '/' || m.id::text || '.webp',
      j.id::text || '/' || m.id::text || '/320.webp',
      j.id::text || '/' || m.id::text || '/390.webp',
      j.id::text || '/' || m.id::text || '/640.webp',
      j.id::text || '/' || m.id::text || '/768.webp'
    ));
$$;
-- CREATE OR REPLACE conserva ownership/grants; no sustituir policies ni ampliar roles.
commit;
