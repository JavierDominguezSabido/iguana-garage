# Infraestructura Supabase

Proyecto `iguana-garage` (`atibisongftmspwtyndv`), actualmente **producción con datos reales**. Las dos migraciones de Gate 3A y la migración responsive están aplicadas. Esta última se aplicó el 7 de octubre de 2026 con autorización explícita, conservando datos, buckets, grants y policies. El conector registró `responsive_private_derivatives` como versión remota `20261007112616`, correspondiente al archivo local `20261007090238_responsive_private_derivatives.sql`; revisar esta correspondencia antes de sincronizar migraciones mediante CLI, sin ejecutar un push ciego. No se utiliza LiftTrack. No ejecutar suites mutantes, reset ni limpieza de fixtures sobre este proyecto.

## Migraciones funcionales en producción

Aplicadas en este orden el 8 de octubre de 2026, únicamente a `atibisongftmspwtyndv`, mediante el conector (que registra su propio timestamp):

| Archivo local | Versión remota | Nombre remoto |
| --- | --- | --- |
| `20261008120000_job_hours_description.sql` | `20261008165445` | `job_hours_description` |
| `20261009120000_media_focal_point.sql` | `20261008165516` | `media_focal_point` |
| `20261010120000_portfolio_curation.sql` | `20261009115638` | `portfolio_curation` |

Revisar también esta correspondencia antes de sincronizar mediante CLI; no reaplicar estos archivos ni las migraciones históricas. Horas nullable con CHECK explícito 0–999,99 (incluye denegación de `NaN`); descripción nullable de 1–500 caracteres normalizados; focales `smallint` 0–100 con default 50/50. Se verificaron RPC, grants, aislamiento por propietario y conservación de datos, policies y objetos Storage. Estas migraciones no cambian Auth, buckets ni políticas RLS.

**Aplicada en producción el 9 de octubre de 2026** (autorización explícita, solo `atibisongftmspwtyndv`, mediante el conector): `20261010120000_portfolio_curation.sql` → versión remota `20261009115638`, nombre `portfolio_curation`. Control de la portada desde `/app` (ver «Portada y muro» más abajo). Aditiva y compatible hacia atrás: `list_public_jobs` conserva firma y forma. Antes se hizo una exportación de solo lectura de `jobs`/`job_media` y de las definiciones sustituidas (plan free, sin copia automática; fuera del repositorio). Comprobado tras aplicar: misma huella del RPC público (4 trabajos, 13 fotos), 65 derivados y 13 originales intactos, siembra de la transformación del Suzuki creada, `anon` sin privilegios sobre `portfolio_settings`, 7 policies de Storage sin cambios y avisos de seguridad sin novedades. Rollback manual en la cabecera del archivo; quitar `hidden_from_home` vuelve a publicar las fotos ocultas, así que es el último recurso.

## Modelo y permisos

`jobs`: UUID, propietario Auth obligatorio, nombre, fecha de calendario, código de pintura nullable, `is_public=false`, timestamps. Nombre no vacío/normalizado (máximo técnico 200 caracteres), código normalizado (máximo 80), fecha entre años 0001 y 9999. Índices por propietario/fecha y parcial por fecha para publicación. `updated_at` se actualiza mediante trigger; los clientes no pueden escribir timestamps, IDs en UPDATE ni transferir propietarios.

`job_media`: UUID, FK de trabajo, ruta única, MIME, posición no negativa y única por trabajo, dimensiones positivas si presentes, tamaño positivo hasta 10 MiB si presente y timestamp. Las FK usan RESTRICT: borrar un usuario/trabajo no borra silenciosamente medios ni bytes. No hay perfiles, roles de aplicación ni propiedades editoriales.

RLS activado en ambas tablas. Autenticados solo pueden SELECT/INSERT/UPDATE/DELETE sobre sus trabajos y medios de trabajos propios; INSERT/UPDATE verifican también el nuevo estado. `anon` carece de privilegios sobre las tablas, incluso para trabajos publicados. Se conceden explícitamente privilegios mínimos, sin depender de los defaults del proyecto.

## Portada y muro (curación)

- `job_media.hidden_from_home boolean not null default false`: la foto no sale de la proyección pública ni es descargable por anon (`private.is_public_derivative` la excluye en los cinco nombres de derivado). El propietario la sigue leyendo por `owns_derivative`. Grant de UPDATE solo sobre esa columna. `UNIQUE (job_id, id)` permite la FK compuesta de la portada.
- `portfolio_settings`: una fila por propietario (PK `owner_id`) con `pinned_job_id` y la transformación destacada (`featured_job_id`, `featured_before_id`, `featured_after_id`). FKs con `ON DELETE SET NULL` (borrar un trabajo o una foto limpia la selección sin bloquear el borrado) y FK compuesta `(featured_job_id, foto) → job_media(job_id, id)`; CHECK de dos fotos distintas y de foto solo junto con su trabajo. RLS por propietario (lectura, alta, edición y borrado propios; los trabajos referenciados deben ser propios); `anon` sin privilegios; grants por columna.
- La home es anónima: `private.active_portfolio_settings()` toma la fila con `updated_at` más reciente (hoy hay un único propietario; con varios mandaría el último en guardar). Sin variables de entorno ni UUID fijo en el código.
- `private.public_job_media(job)` agrega las fotos visibles (derivado existente y no ocultas). `list_public_jobs` ordena primero el trabajo fijado y luego por fecha/UUID, así la paginación no repite ni pierde trabajos.
- `get_featured_transformation()` (SECURITY INVOKER sobre una función privada SECURITY DEFINER) devuelve `{ id, name, job_date, media, description, before_id, after_id }` solo si el trabajo está publicado y las dos fotos son distintas, visibles y con derivado; si no, ninguna fila y la portada queda con el título solo. La selección no se borra al despublicar: queda dormida y reaparece al republicar. No expone `owner_id`, fotos ocultas ni la fila de ajustes.

## Originales y entrega pública

- `job-originals`: bucket **privado**, JPEG/PNG/WebP, máximo 10 MiB. Ruta `owner_uuid/job_uuid/media_uuid.ext`. INSERT exige ámbito propio y trabajo propio existente. SELECT/DELETE restringidos al ámbito propio; permiten limpiar originales huérfanos. Sin UPDATE/upsert.
- `portfolio-derivatives`: bucket **privado**, solo WebP, máximo 5 MiB. Master compatible `job_uuid/media_uuid.webp` y cuatro variantes `job_uuid/media_uuid/{320,390,640,768}.webp`. La migración responsive amplía exclusivamente las dos funciones de autorización, con cinco nombres exactos por medio; no cambia buckets, grants, policies ni RPC. Los cinco paths están autorizados en producción con control de propietario/publicación. Sharp procesa todas las variantes durante la subida: orientación EXIF, proporción conservada, sin upscale ni metadata; calidad 78 para pequeñas/medias y 82 para el master. El original privado conserva sus bytes.
- Lectura pública de derivados solo mediante operaciones Storage de descarga/información autenticada con clave publicable, y solo si el trabajo sigue publicado. No enumeración anónima, URLs de bucket público ni firma anónima. Las subidas usan `cacheControl: "0"`; la home y la entrega de imágenes evitan caché compartida. Al despublicar, la siguiente petición se vuelve a autorizar; no se pueden recuperar archivos ya descargados.

La home usa un cliente anónimo servidor, independiente de cookies, y el RPC existente. El endpoint valida UUID/anchos y descarga una variante preparada bajo RLS en cada petición; entrega sus bytes sin Sharp. Si falta la variante, descarga el master con una nueva comprobación RLS y aplica el resize legacy, nunca originales. El master 1600 se transmite directamente. Las URLs históricas de ocho tamaños siguen admitidas, pero nuevas imágenes solicitan solo los cinco tamaños preparados. `next/image` conserva `sizes` y espacio reservado; `/_next/image` tiene bloqueadas estas rutas. Respuestas `private, no-store`, incluidas denegaciones. Sin cache pública ni signed URLs.

Upload escribe el master al final, limpia variantes nuevas si falla y conserva original/metadata para reintentar. La subida directa exige que el trabajo esté privado, como ya hace el formulario mediante `prepareJob`. Delete elimina las cinco rutas antes del original y metadata. Mantenimiento propietario explícito, dry-run por defecto y sin sobrescribir masters/originales: ver [pipeline y evidencias](../docs/image-pipeline.md). No se ha ejecutado sobre las 13 fotografías reales.

El RPC `list_public_jobs(p_limit=50, p_offset=0)` entrega solo:

```ts
{ id: string; name: string; job_date: string; media: { id: string; path: string; focal_x: number; focal_y: number }[]; description: string | null }[]
```

Solo aparecen `is_public=true`; `media` incluye únicamente derivados existentes. Orden estable por fecha/UUID y por posición/UUID; respuesta limitada a 100 trabajos. `focal_x`/`focal_y` (% 0–100, centro 50/50; migración `20261009120000_media_focal_point`) solo viajan para medios publicados con derivado existente y solo afectan a `object-position` del recorte cover. Además `description` (texto plano opcional, ≤ 500 caracteres; migración `20261008120000_job_hours_description`). No devuelve `owner_id`, `paint_code`, `work_hours` (horas de trabajo, privadas), `storage_path` original, tamaños ni timestamps. El parser TypeScript vuelve a proyectar campos expresamente públicos.

El RPC expuesto es SECURITY INVOKER y delega la proyección en funciones de lectura SECURITY DEFINER **privadas**, con `search_path=''`, referencias cualificadas, argumentos acotados y sin SQL dinámico. Esta excepción está limitada a lectura pública explícita, no a gestión de trabajos ni a corregir errores de permisos. El esquema `private` no debe exponerse en Data API. No hay service-role en el código Next.js.

El MVP elimina objetos -> metadatos -> trabajo y conserva metadatos ante errores para reintentar. PostgreSQL y Storage no son una transacción conjunta. Los objetos se borran mediante la API con identidad del usuario. La subida procesa una imagen por petición (10 MiB, hasta 40 megapíxeles, sin animación), conserva originales y genera WebP separado. Guardado reanudable por UUID; normaliza posiciones sin colisiones y solo publica tras completar las fotos. Antes de editar/eliminar se retira la publicación. No se modificaron esquema, grants ni políticas de Gate 3A.

## Auth y Next.js

Cliente de navegador con `@supabase/ssr`; servidor marcado `server-only` y cookies de lectura por defecto. Cookies Secure en producción; SameSite=Lax conforme al SDK. Server Actions podrán solicitar escritura explícita. Proxy de Next.js 16 se limita a `/app/:path*` y `/login`; renueva/conserva cookies y evita caché, incluidos redirects y errores. Valida la identidad con `getUser()` contra Auth; no autoriza mediante `getSession()` ni `user_metadata`.

Cada futura operación privada debe llamar a `requireAuthenticatedSupabase()` y ejecutar consultas con esa identidad/RLS. Proxy no sustituye esta comprobación. Futuros Route Handlers que escriban cookies/datos privados deberán mantener `Cache-Control: private, no-store` en sus respuestas. Cookies SSR del cliente son accesibles al navegador como requiere Supabase; no guardar contraseñas ni claves privilegiadas en ellas. Nunca usar caché compartida para sesiones.

V1: cuenta de Robin aprovisionada en Auth, sin autorregistro, perfiles ni roles. **El `config.toml` solo configura el stack local.** En remoto, desactivar «Allow new users to sign up» y anonymous sign-ins en Dashboard; crear la cuenta de Robin manualmente. Email/contraseña Auth, sin comprobaciones locales de contraseña. La aplicación solo necesita las dos variables de `.env.example`, diseñadas para navegador.

## Repetición de pruebas

**Para este bloque utilizar `npm run test:isolated`.** No carga `.env`, crea PostgreSQL efímero y ejecuta las migraciones/policies reales con roles separados. Su adaptador HTTP sirve únicamente transporte de pruebas local: no equivale al servicio HTTP completo de Supabase, GoTrue o Storage. Las instrucciones históricas siguientes solo son válidas en un destino de desarrollo dedicado; **no en el proyecto actual de producción**.

Unitarias: `npm test` y `npm run test:coverage`. HTTP anónimo real: `npm run test:supabase:public`. SQL real: ejecutar íntegro `supabase/tests/authorization.sql` en el SQL Editor/conector del proyecto de desarrollo autorizado. Usa roles reales y `auth.uid()` con claims de prueba, assertions activadas y transacción revertida; no demuestra emisión de JWT ni transferencia de bytes de Storage.

HTTP Auth/Storage: provisionar dos cuentas **temporales, confirmadas y distintas** en este proyecto de desarrollo. Copiar `.env.integration.example` a `.env.integration.local`, completar ref, `SUPABASE_TEST_DISPOSABLE=true` y credenciales localmente. Ejecutar `npm run test:supabase`. Sin esas cuentas/destino confirmado, la suite falla en setup: no equivale a PASS. Después retirar las cuentas temporales desde Dashboard, dejando solo Robin.

La prueba de JWT expirado queda **OMITIDA por decisión explícita de alcance del usuario, no PASS**. Supabase implementa la validación criptográfica y la caducidad del access token; nuestro código no las modifica. No se exige un fixture de JWT ni se revalida la criptografía con tokens alterados. Las pruebas conservan políticas RLS, CRUD propio, Storage, publicación `is_public`, contrato público y denegaciones anónimas. Sí se verifica el cierre de registro/anonymous sign-ins, porque es configuración propia del proyecto. Ver resultados y límites en `docs/gate-3a-verification.md`.

La suite crea UUID aleatorios, imágenes sintéticas y datos aislados; elimina únicamente sus propios IDs con sesión A y cierra las sesiones. No necesita clave service-role. Revisar la limpieza ante cualquier fallo; no eliminar metadatos si falla la eliminación de objetos.

Local: requiere Docker en ejecución. CLI oficial fijado en npm; `npx --no-install supabase start` aplica las migraciones en el stack local y usa Auth con registro desactivado. Repetir las assertions SQL con `npx --no-install supabase db query --local --file supabase/tests/authorization.sql`. No ejecutar reset/push sobre datos existentes sin revisar el destino. Los tipos se generaron desde el esquema remoto real (`src/lib/supabase/database.types.ts`).

Fuentes verificadas: [SSR Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [operaciones Storage](https://supabase.com/docs/guides/storage/schema/helper-functions), [grants explícitos](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
