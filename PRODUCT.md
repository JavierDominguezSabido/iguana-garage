# Iguana Garage — producto actual

## Estado y alcance

Web de taller de chapa y pintura desplegada en Render: portfolio fotográfico público y gestión privada para **un propietario operativo**, usada principalmente desde teléfono. El modelo aísla datos por usuario, pero no existe gestión multiusuario/roles. Los trabajos representan reparaciones terminadas; no hay estados de ejecución ni CRM.

[AGENTS.md](AGENTS.md) rige la operación y [DESIGN.md](DESIGN.md) la identidad y dirección visual. Este documento describe lo implementado; las notas de fases anteriores no son una hoja de ruta pendiente.

## Público

| Ruta/superficie | Comportamiento |
| --- | --- |
| `/` | Una sola home pública que contiene: trabajos publicados con galería, transformación destacada cuando está disponible y contacto por WhatsApp. Estructura, orden y presentación los decide [DESIGN.md](DESIGN.md). Sin login visible ni páginas públicas individuales por trabajo. |
| Transformación | Pareja Antes/Después elegida por el propietario en la pantalla «Portada» de `/app`: trabajo publicado y dos fotos distintas del mismo trabajo. Las fotos pueden estar ocultas del muro: se ven en el comparador y en el visor de «Ver fotos» (fotos visibles del trabajo más la pareja, por posición, abriendo en el Después) y solo son descargables públicamente mientras estén destacadas y el trabajo publicado. Se presenta como comparador de una sola imagen con barra arrastrable (ratón, táctil y teclado). No se infiere por posición/nombre de archivo ni hay nada fijo en el código. Solo en la página 1 y con lectura propia (`get_featured_transformation`), independiente de la paginación. Si el trabajo se despublica, una foto se borra o falta un derivado, la portada queda solo con el título; la selección no se borra al despublicar: queda dormida y reaparece al republicar. |
| Trabajos y galería | Solo `is_public=true` con al menos una foto visible en el muro (sin foto visible no hay banda); orden por fecha/UUID (el trabajo fijado desde `/app`, como mucho uno, va el primero sin insignia), paginación de 12 trabajos. Las fotos de cada trabajo siguen el orden que el propietario fija en la pantalla «Portada» (`position`). Una foto oculta no sale en el muro ni se puede descargar públicamente, salvo que sea el Antes o el Después de la portada. Cada trabajo es una banda (nombre, fecha, número de fotos y descripción si existe) con todas sus fotos en un muro; cada foto abre el visor en esa imagen, con contador, miniaturas, anterior/siguiente, cierre, teclado y tira que sigue el dedo en táctil y encaja en la foto siguiente/anterior, con solo la actual y sus vecinas montadas y la miniatura difuminada hasta que carga la buena (visor a pantalla completa; el privado de `/app/jobs/[id]` comparte comportamiento con él). |
| WhatsApp | CTA construido desde `IGUANA_WHATSAPP_NUMBER` válido en formato E.164; sin valor válido muestra contacto pendiente. No inventar números ni datos comerciales. En móvil, con número válido, un botón fijo inferior repite el CTA mientras el título no se ve (se retira en contacto, pie y con el visor abierto). |
| Compartir | `og:image`/`twitter:image` apuntan a `/share/iguana-garage-og.png`: imagen estática de 1200×630, solo marca (logo oficial sobre Carbon), sin fotos de trabajos. URL absoluta con `RENDER_EXTERNAL_URL` o, si falta, la de producción. |
| `/api/portfolio/photos/[jobId]/[mediaId]` | Descarga same-origin de derivados permitidos, reautorizada mediante RLS en cada petición; nunca entrega originales. |

La home usa un cliente anónimo servidor sin cookies, aun cuando la visita el propietario. La portada y el muro se piden en paralelo y fallan por separado: si falla la transformación, la portada queda con el título solo y el muro sigue. El RPC `get_featured_transformation` devuelve el trabajo (misma proyección pública) más los dos IDs elegidos, o ninguna fila. El RPC `list_public_jobs` proyecta exclusivamente `id`, `name`, `job_date`, `media: {id,path}[]` y `description` (null si no hay); cada medio añade `focal_x`/`focal_y` (solo presentación, `object-position` en recortes cover; el visor `contain` no lo usa). No expone `owner_id`, `paint_code`, `work_hours`, rutas de originales ni metadatos privados. La retirada mediante `is_public=false` deniega nuevas lecturas/descargas; no recupera copias ya descargadas. No hay caché compartida del portfolio revocable ni URLs firmadas públicas.

## Privado y sesión

| Ruta | Función |
| --- | --- |
| `/app/login` | Único formulario real de email/contraseña Supabase Auth; la etiqueta dice «Usuario». Con sesión válida redirige a `/app`. |
| `/login` | Alias legacy: HTTP 307 desde el proxy a `/app/login`, sin página React ni HTML prerenderizado. |
| `/app` | Listado propio paginado, acceso al detalle y creación de trabajo. |
| `/app/new` | Alta de trabajo y selección/subida de fotos. |
| `/app/jobs/[id]` | Detalle propio, galería/visor, edición y borrado con confirmación, y una línea de estado de portada («En portada · Fijado · 2 fotos ocultas») con el enlace «Gestionar en Portada». |
| `/app/jobs/[id]/edit` | Edición de datos/fotos y publicar/retirar mediante `is_public`. |
| `/app/portada` | Gestión de la página principal en un solo sitio, pensada para móvil: los trabajos publicados como se verán en la web (el fijado primero) y, al final, atenuados y marcados «Privado», los privados; cada uno con sus fotos en fila. Reordenar fotos arrastrando (táctil: mantener pulsado y mover; ratón: arrastrar), con los botones ←/→ de la barra de acciones y con Mayús + ←/→; ocultar/mostrar fotos en el muro; elegir Antes, Después y «Destacar en portada»; interruptores «Fijar arriba» (solo publicados, como mucho uno) y «Publicado» (publicar/despublicar sin entrar en la ficha). Todo se guarda al momento; las demás acciones solo existen para trabajos publicados. |

CRUD y fotografías usan Route Handlers en `/app/api/jobs`, `/app/api/jobs/[id]` (fases `prepare`, `finish` y `publish`) y `/app/api/jobs/[id]/photos/[mediaId]` (`PATCH` guarda el encuadre o, con `{hidden}`, la visibilidad en el muro); el orden de las fotos, en `PATCH /app/api/jobs/[id]/order` (RPC atómico `reorder_job_media`) y los ajustes de portada, en `PATCH /app/api/portfolio`; la lectura de fotos usa `/app/api/photos/[id]`. Login/logout usan Server Actions. Todo acceso de gestión se valida en servidor y por propietario/RLS, no solo en el layout. Sin sesión válida, `/app` redirige a `/app/login`; login vuelve a `/app` y logout local a `/app/login`.

Campos de trabajo: nombre libre obligatorio (1–200 caracteres), fecha de calendario obligatoria y código de pintura opcional (hasta 80; vacío → null), **horas de trabajo** opcionales y privadas (0–999,99 con hasta 2 decimales; se escriben con coma o punto) y **descripción** opcional en texto plano (hasta 500) que solo es pública si el trabajo está publicado. Se permiten trabajos sin fotos. No hay catálogo de vehículos. El guardado mantiene el trabajo privado durante cambios/subidas y solo restaura la publicación solicitada al completar la operación. Ante fallos conserva el estado confirmado para reintentar; borrar coordina derivados → original → metadatos → trabajo, sin anunciar éxito parcial.

## Datos y autorización

| Entidad | Datos actuales |
| --- | --- |
| Supabase Auth | Identidad y sesión; sin tablas propias de contraseñas/perfiles, registro público ni roles de aplicación en la UI. |
| `jobs` | `id`, `owner_id` FK a Auth, `name`, `job_date`, `paint_code` nullable, `work_hours` `numeric(5,2)` nullable (privado), `description` texto plano nullable (≤ 500), `is_public=false` por defecto, `created_at`, `updated_at`. |
| `job_media` | `id`, `job_id`, `storage_path` único, `mime_type`, `position` no negativa y única por trabajo, dimensiones, tamaño original, **punto focal** `focal_x`/`focal_y` (`smallint` 0–100, 50/50 = centro), `hidden_from_home` (`boolean`, por defecto false; significa «no sale en el muro») y `created_at`. |
| `portfolio_settings` | Una fila por propietario: `pinned_job_id` (trabajo fijado) y la transformación destacada (`featured_job_id`, `featured_before_id`, `featured_after_id`, con FK compuesta a `job_media(job_id, id)`). `ON DELETE SET NULL`; RLS por propietario. La home usa la fila modificada más recientemente (hoy hay un único propietario). |

RLS separa trabajos y medios por propietario; anon no lee las tablas privadas, aunque un trabajo esté publicado. Ambos buckets son privados: `job-originals` y `portfolio-derivatives`. Lectura pública de derivados solo si el medio pertenece al trabajo y este sigue publicado. Gestión/subidas/mantenimiento usan identidad normal + RLS, sin `service_role`. PostgreSQL y Storage no forman una transacción conjunta: las operaciones incluyen recuperación/limpieza y no confían en borrar solo una fila.

## Pipeline real de imágenes

- Entrada: JPEG, PNG o WebP, sin animación, hasta **10 MiB** y **40 megapíxeles**; validación de bytes, formato y dimensiones en servidor.
- Original privado conservado byte a byte en `owner_uuid/job_uuid/media_uuid.{jpg,png,webp}`.
- Sharp en subida: orienta según EXIF, conserva proporción, evita ampliación y retira metadatos de derivados. Master WebP de hasta **1600 px** (calidad 82) y sidecars **320/390/640/768** (calidad 78).
- Master compatible: `job_uuid/media_uuid.webp`. Sidecars exactos: `job_uuid/media_uuid/{320,390,640,768}.webp`. No existe sidecar 1600, ni se autorizan anchos/rutas arbitrarios en Storage.
- Público y galería/visor privados usan loaders/`sizes` para elegir variantes preparadas. La entrega normal transmite WebP existente **sin Sharp por request**; `/_next/image` no puede cachear estas rutas. Hay vistas privadas `unoptimized` que usan directamente el master, y acceso explícito al original con autorización.
- Compatibilidad: si falta un sidecar, el privado puede servir el master; el público conserva un resize legacy excepcional del master. Las entradas públicas antiguas `w=160/1024/1440` se mapean a rutas permitidas, no crean nuevos permisos de Storage.
- Respuestas privadas y fotografías revocables: `private, no-store`, con CDN `no-store` en endpoints de imagen. Preparación de medios antiguos es mantenimiento explícito, dry-run por defecto, propietario + RLS y escritura habilitada solo para el proyecto confirmado; no ocurre al navegar.

### Encuadre (punto focal)

El propietario puede abrir «Encuadre» en cada foto guardada de `/app/jobs/[id]/edit`, mover un marco 4:3 sobre la foto completa (táctil, ratón o teclado), ver vistas previas fieles y guardar explícitamente (`PATCH /app/api/jobs/[id]/photos/[mediaId]`). Solo se guarda un par de enteros: no se recorta ni se regenera original, master ni sidecars, y se puede cambiar con el trabajo publicado. El encuadre se aplica a todos los recortes `cover`: en la home pública y, en la gestión, en las tarjetas de `/app`, las miniaturas de la galería del detalle y las del formulario de edición. La foto principal del detalle y el visor muestran la imagen completa y no lo usan; sin valor guardado, centro (50/50).

## PWA y estructura

PWA **solo privada**: manifest `/pwa/manifest.webmanifest`, `scope=/app`, `start_url=/app`, `display=standalone`. Se enlaza desde `src/app/app/layout.tsx`, incluido `/app/login`; la gestión vive en `(workspace)` sin alterar URLs. La home pública no enlaza manifest y queda fuera del scope. Login, pérdida de sesión y logout permanecen dentro de `/app`.

Sin service worker, persistencia offline de datos ni caché privada compleja; necesita conexión. Iconos PWA, apple-touch-icon y favicon son derivados técnicos oficiales separados de los originales.

Mapa: `src/features/auth` (sesión UI/actions), `jobs` (CRUD/medios), `portfolio` (contrato/entrega/galería/transformación), `pwa` (metadata); `src/lib/supabase` (clientes/sesión/tipos), `src/proxy.ts` (CSP/guard/alias), `supabase/migrations` (modelo/policies), `tests/isolated`, `tests/supabase` y `e2e` (verificación). La frontera de aplicación `jobs/data.ts` mantiene `server-only`; su módulo interno `jobs/server/media.ts` se comparte con mantenimiento Node.

Producción: Render Web Service con Node completo/SSR/Sharp; despliegue automático desde el push autorizado a GitHub `main`. No es una exportación estática. Credenciales y configuración remota no forman parte de estos documentos; no fijar inventarios de datos vivos como constantes.

## Fuera de alcance actual

CRM, presupuestos, clientes, matrículas como campo, materiales/piezas, estados de reparación, notas/descripciones adicionales, búsqueda/filtros, catálogos, reordenación de trabajos entre sí (solo se fija uno), gestión multiusuario/roles, registro/recuperación de cuenta desde la UI, vídeos, páginas públicas individuales, más de una transformación destacada y nuevas funciones sin aprobación. La PWA no incorpora offline ni sincronización en segundo plano.
