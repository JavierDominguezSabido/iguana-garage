# Infraestructura Supabase

Proyecto de desarrollo autorizado: `iguana-garage` (`atibisongftmspwtyndv`). Las migraciones fueron aplicadas mediante el conector Supabase y sus versiones locales coinciden con el historial remoto. No se utiliza LiftTrack. Sin interfaces de producto, datos demo ni copias públicas de assets.

## Modelo y permisos

`jobs`: UUID, propietario Auth obligatorio, nombre, fecha de calendario, código de pintura nullable, `is_public=false`, timestamps. Nombre no vacío/normalizado (máximo técnico 200 caracteres), código normalizado (máximo 80), fecha entre años 0001 y 9999. Índices por propietario/fecha y parcial por fecha para publicación. `updated_at` se actualiza mediante trigger; los clientes no pueden escribir timestamps, IDs en UPDATE ni transferir propietarios.

`job_media`: UUID, FK de trabajo, ruta única, MIME, posición no negativa y única por trabajo, dimensiones positivas si presentes, tamaño positivo hasta 10 MiB si presente y timestamp. Las FK usan RESTRICT: borrar un usuario/trabajo no borra silenciosamente medios ni bytes. No hay perfiles, roles de aplicación ni propiedades editoriales.

RLS activado en ambas tablas. Autenticados solo pueden SELECT/INSERT/UPDATE/DELETE sobre sus trabajos y medios de trabajos propios; INSERT/UPDATE verifican también el nuevo estado. `anon` carece de privilegios sobre las tablas, incluso para trabajos publicados. Se conceden explícitamente privilegios mínimos, sin depender de los defaults del proyecto.

## Originales y entrega pública

- `job-originals`: bucket **privado**, JPEG/PNG/WebP, máximo 10 MiB. Ruta `owner_uuid/job_uuid/media_uuid.ext`. INSERT exige ámbito propio y trabajo propio existente. SELECT/DELETE restringidos al ámbito propio; permiten limpiar originales huérfanos. Sin UPDATE/upsert.
- `portfolio-derivatives`: bucket **privado**, solo WebP, máximo 5 MiB. Ruta `job_uuid/media_uuid.webp`. Escritura/borrado exigen medio de un trabajo propio. El MVP privado genera derivados en servidor con Sharp: decodificación completa, orientación, hasta 1600 px por lado, WebP y eliminación de metadatos. No se copian originales como publicación; el usuario revisa qué fotos hace públicas mediante el control `is_public`.
- Lectura pública de derivados solo mediante operaciones Storage de descarga/información autenticada con clave publicable, y solo si el trabajo sigue publicado. No enumeración anónima, URLs de bucket público ni firma anónima. Usar `cacheControl: "0"` en la futura publicación y respuestas sin caché compartida. Al despublicar, la siguiente petición se vuelve a autorizar; no se pueden recuperar archivos ya descargados.

El RPC `list_public_jobs(p_limit=50, p_offset=0)` entrega solo:

```ts
{ id: string; name: string; job_date: string; media: { id: string; path: string }[] }[]
```

Solo aparecen `is_public=true`; `media` incluye únicamente derivados existentes. Orden estable por fecha/UUID y por posición/UUID; respuesta limitada a 100 trabajos. No devuelve `owner_id`, `paint_code`, `storage_path` original, tamaños ni timestamps. El parser TypeScript vuelve a proyectar campos expresamente públicos.

El RPC expuesto es SECURITY INVOKER y delega la proyección en funciones de lectura SECURITY DEFINER **privadas**, con `search_path=''`, referencias cualificadas, argumentos acotados y sin SQL dinámico. Esta excepción está limitada a lectura pública explícita, no a gestión de trabajos ni a corregir errores de permisos. El esquema `private` no debe exponerse en Data API. No hay service-role en el código Next.js.

El MVP elimina objetos -> metadatos -> trabajo y conserva metadatos ante errores para reintentar. PostgreSQL y Storage no son una transacción conjunta. Los objetos se borran mediante la API con identidad del usuario. La subida procesa una imagen por petición (10 MiB, hasta 40 megapíxeles, sin animación), conserva originales y genera WebP separado. Guardado reanudable por UUID; normaliza posiciones sin colisiones y solo publica tras completar las fotos. Antes de editar/eliminar se retira la publicación. No se modificaron esquema, grants ni políticas de Gate 3A.

## Auth y Next.js

Cliente de navegador con `@supabase/ssr`; servidor marcado `server-only` y cookies de lectura por defecto. Cookies Secure en producción; SameSite=Lax conforme al SDK. Server Actions podrán solicitar escritura explícita. Proxy de Next.js 16 se limita a `/app/:path*` y `/login`; renueva/conserva cookies y evita caché, incluidos redirects y errores. Valida la identidad con `getUser()` contra Auth; no autoriza mediante `getSession()` ni `user_metadata`.

Cada futura operación privada debe llamar a `requireAuthenticatedSupabase()` y ejecutar consultas con esa identidad/RLS. Proxy no sustituye esta comprobación. Futuros Route Handlers que escriban cookies/datos privados deberán mantener `Cache-Control: private, no-store` en sus respuestas. Cookies SSR del cliente son accesibles al navegador como requiere Supabase; no guardar contraseñas ni claves privilegiadas en ellas. Nunca usar caché compartida para sesiones.

V1: cuenta de Robin aprovisionada en Auth, sin autorregistro, perfiles ni roles. **El `config.toml` solo configura el stack local.** En remoto, desactivar «Allow new users to sign up» y anonymous sign-ins en Dashboard; crear la cuenta de Robin manualmente. Email/contraseña Auth, sin comprobaciones locales de contraseña. La aplicación solo necesita las dos variables de `.env.example`, diseñadas para navegador.

## Repetición de pruebas

Unitarias: `npm test` y `npm run test:coverage`. HTTP anónimo real: `npm run test:supabase:public`. SQL real: ejecutar íntegro `supabase/tests/authorization.sql` en el SQL Editor/conector del proyecto de desarrollo autorizado. Usa roles reales y `auth.uid()` con claims de prueba, assertions activadas y transacción revertida; no demuestra emisión de JWT ni transferencia de bytes de Storage.

HTTP Auth/Storage: provisionar dos cuentas **temporales, confirmadas y distintas** en este proyecto de desarrollo. Copiar `.env.integration.example` a `.env.integration.local`, completar ref, `SUPABASE_TEST_DISPOSABLE=true` y credenciales localmente. Ejecutar `npm run test:supabase`. Sin esas cuentas/destino confirmado, la suite falla en setup: no equivale a PASS. Después retirar las cuentas temporales desde Dashboard, dejando solo Robin.

La prueba de JWT expirado queda **OMITIDA por decisión explícita de alcance del usuario, no PASS**. Supabase implementa la validación criptográfica y la caducidad del access token; nuestro código no las modifica. No se exige un fixture de JWT ni se revalida la criptografía con tokens alterados. Las pruebas conservan políticas RLS, CRUD propio, Storage, publicación `is_public`, contrato público y denegaciones anónimas. Sí se verifica el cierre de registro/anonymous sign-ins, porque es configuración propia del proyecto. Ver resultados y límites en `docs/gate-3a-verification.md`.

La suite crea UUID aleatorios, imágenes sintéticas y datos aislados; elimina únicamente sus propios IDs con sesión A y cierra las sesiones. No necesita clave service-role. Revisar la limpieza ante cualquier fallo; no eliminar metadatos si falla la eliminación de objetos.

Local: requiere Docker en ejecución. CLI oficial fijado en npm; `npx --no-install supabase start` aplica las migraciones en el stack local y usa Auth con registro desactivado. Repetir las assertions SQL con `npx --no-install supabase db query --local --file supabase/tests/authorization.sql`. No ejecutar reset/push sobre datos existentes sin revisar el destino. Los tipos se generaron desde el esquema remoto real (`src/lib/supabase/database.types.ts`).

Fuentes verificadas: [SSR Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [operaciones Storage](https://supabase.com/docs/guides/storage/schema/helper-functions), [grants explícitos](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
