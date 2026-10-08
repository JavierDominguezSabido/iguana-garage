# Iguana Garage — producto actual

## Estado y alcance

Web de taller de chapa y pintura desplegada en Render: portfolio fotográfico público y gestión privada para **un propietario operativo**, usada principalmente desde teléfono. El modelo aísla datos por usuario, pero no existe gestión multiusuario/roles. Los trabajos representan reparaciones terminadas; no hay estados de ejecución ni CRM.

[AGENTS.md](AGENTS.md) rige la operación y [DESIGN.md](DESIGN.md) la identidad y dirección visual. Este documento describe lo implementado; las notas de fases anteriores no son una hoja de ruta pendiente.

## Público

| Ruta/superficie | Comportamiento |
| --- | --- |
| `/` | Una home con hero de copy/CTA, transformación destacada cuando está disponible, trabajos/galería, contacto y footer. Sin login visible ni páginas públicas individuales por trabajo. |
| Transformación | Pareja Antes/Después seleccionada explícitamente del mismo trabajo publicado. No se infiere por posición/nombre de archivo; se oculta si el trabajo o alguna foto no están en el contrato público disponible. No hay editor de destacados. |
| Trabajos y galería | Solo `is_public=true`; orden por fecha/UUID, paginación de 12 trabajos, fotos ampliables con contador, miniaturas, anterior/siguiente, cierre y teclado. |
| WhatsApp | CTA construido desde `IGUANA_WHATSAPP_NUMBER` válido en formato E.164; sin valor válido muestra contacto pendiente. No inventar números ni datos comerciales. |
| `/api/portfolio/photos/[jobId]/[mediaId]` | Descarga same-origin de derivados permitidos, reautorizada mediante RLS en cada petición; nunca entrega originales. |

La home usa un cliente anónimo servidor sin cookies, aun cuando la visita el propietario. El RPC `list_public_jobs` proyecta exclusivamente `id`, `name`, `job_date` y `media: {id,path}[]`. No expone `owner_id`, `paint_code`, rutas de originales ni metadatos privados. La retirada mediante `is_public=false` deniega nuevas lecturas/descargas; no recupera copias ya descargadas. No hay caché compartida del portfolio revocable ni URLs firmadas públicas.

## Privado y sesión

| Ruta | Función |
| --- | --- |
| `/app/login` | Único formulario real de email/contraseña Supabase Auth; la etiqueta dice «Usuario». Con sesión válida redirige a `/app`. |
| `/login` | Alias legacy: HTTP 307 desde el proxy a `/app/login`, sin página React ni HTML prerenderizado. |
| `/app` | Listado propio paginado, acceso al detalle y creación de trabajo. |
| `/app/new` | Alta de trabajo y selección/subida de fotos. |
| `/app/jobs/[id]` | Detalle propio, galería/visor, edición y borrado con confirmación. |
| `/app/jobs/[id]/edit` | Edición de datos/fotos y publicar/retirar mediante `is_public`. |

CRUD y fotografías usan Route Handlers en `/app/api/jobs`, `/app/api/jobs/[id]` y `/app/api/jobs/[id]/photos/[mediaId]`; la lectura de fotos usa `/app/api/photos/[id]`. Login/logout usan Server Actions. Todo acceso de gestión se valida en servidor y por propietario/RLS, no solo en el layout. Sin sesión válida, `/app` redirige a `/app/login`; login vuelve a `/app` y logout local a `/app/login`.

Campos de trabajo: nombre libre obligatorio (1–200 caracteres), fecha de calendario obligatoria y código de pintura opcional (hasta 80; vacío → null). Se permiten trabajos sin fotos. No hay catálogo de vehículos. El guardado mantiene el trabajo privado durante cambios/subidas y solo restaura la publicación solicitada al completar la operación. Ante fallos conserva el estado confirmado para reintentar; borrar coordina derivados → original → metadatos → trabajo, sin anunciar éxito parcial.

## Datos y autorización

| Entidad | Datos actuales |
| --- | --- |
| Supabase Auth | Identidad y sesión; sin tablas propias de contraseñas/perfiles, registro público ni roles de aplicación en la UI. |
| `jobs` | `id`, `owner_id` FK a Auth, `name`, `job_date`, `paint_code` nullable, `is_public=false` por defecto, `created_at`, `updated_at`. |
| `job_media` | `id`, `job_id`, `storage_path` único, `mime_type`, `position` no negativa y única por trabajo, dimensiones, tamaño original y `created_at`. |

RLS separa trabajos y medios por propietario; anon no lee las tablas privadas, aunque un trabajo esté publicado. Ambos buckets son privados: `job-originals` y `portfolio-derivatives`. Lectura pública de derivados solo si el medio pertenece al trabajo y este sigue publicado. Gestión/subidas/mantenimiento usan identidad normal + RLS, sin `service_role`. PostgreSQL y Storage no forman una transacción conjunta: las operaciones incluyen recuperación/limpieza y no confían en borrar solo una fila.

## Pipeline real de imágenes

- Entrada: JPEG, PNG o WebP, sin animación, hasta **10 MiB** y **40 megapíxeles**; validación de bytes, formato y dimensiones en servidor.
- Original privado conservado byte a byte en `owner_uuid/job_uuid/media_uuid.{jpg,png,webp}`.
- Sharp en subida: orienta según EXIF, conserva proporción, evita ampliación y retira metadatos de derivados. Master WebP de hasta **1600 px** (calidad 82) y sidecars **320/390/640/768** (calidad 78).
- Master compatible: `job_uuid/media_uuid.webp`. Sidecars exactos: `job_uuid/media_uuid/{320,390,640,768}.webp`. No existe sidecar 1600, ni se autorizan anchos/rutas arbitrarios en Storage.
- Público y galería/visor privados usan loaders/`sizes` para elegir variantes preparadas. La entrega normal transmite WebP existente **sin Sharp por request**; `/_next/image` no puede cachear estas rutas. Hay vistas privadas `unoptimized` que usan directamente el master, y acceso explícito al original con autorización.
- Compatibilidad: si falta un sidecar, el privado puede servir el master; el público conserva un resize legacy excepcional del master. Las entradas públicas antiguas `w=160/1024/1440` se mapean a rutas permitidas, no crean nuevos permisos de Storage.
- Respuestas privadas y fotografías revocables: `private, no-store`, con CDN `no-store` en endpoints de imagen. Preparación de medios antiguos es mantenimiento explícito, dry-run por defecto, propietario + RLS y escritura habilitada solo para el proyecto confirmado; no ocurre al navegar.

## PWA y estructura

PWA **solo privada**: manifest `/pwa/manifest.webmanifest`, `scope=/app`, `start_url=/app`, `display=standalone`. Se enlaza desde `src/app/app/layout.tsx`, incluido `/app/login`; la gestión vive en `(workspace)` sin alterar URLs. La home pública no enlaza manifest y queda fuera del scope. Login, pérdida de sesión y logout permanecen dentro de `/app`.

Sin service worker, persistencia offline de datos ni caché privada compleja; necesita conexión. Iconos PWA, apple-touch-icon y favicon son derivados técnicos oficiales separados de los originales.

Mapa: `src/features/auth` (sesión UI/actions), `jobs` (CRUD/medios), `portfolio` (contrato/entrega/galería/transformación), `pwa` (metadata); `src/lib/supabase` (clientes/sesión/tipos), `src/proxy.ts` (CSP/guard/alias), `supabase/migrations` (modelo/policies), `tests/isolated`, `tests/supabase` y `e2e` (verificación). La frontera de aplicación `jobs/data.ts` mantiene `server-only`; su módulo interno `jobs/server/media.ts` se comparte con mantenimiento Node.

Producción: Render Web Service con Node completo/SSR/Sharp; despliegue automático desde el push autorizado a GitHub `main`. No es una exportación estática. Credenciales y configuración remota no forman parte de estos documentos; no fijar inventarios de datos vivos como constantes.

## Fuera de alcance actual

CRM, presupuestos, clientes, matrículas como campo, materiales/piezas, estados de reparación, notas/descripciones adicionales, búsqueda/filtros, catálogos, reordenación manual, gestión multiusuario/roles, registro/recuperación de cuenta desde la UI, vídeos, páginas públicas individuales, editor de transformación y nuevas funciones sin aprobación. La PWA no incorpora offline ni sincronización en segundo plano.
