# Iguana Garage — producto y propuesta inicial

**Gate 1: preparado para revisión. Arquitectura, datos y fases son propuestas; implementación pendiente de aprobación.**

## Producto confirmado

Web de un pequeño taller de chapa y pintura. Portfolio público y área privada para Robin, utilizada prácticamente siempre desde teléfono. Los trabajos se registran terminados.

| Superficie | V1 |
| --- | --- |
| `/` | Una página visual de trabajos y fotos; contacto rápido, especialmente WhatsApp. Sin enlaces visibles al área privada ni páginas públicas por trabajo. |
| `/login` | Inicio de sesión real con Supabase Auth. |
| `/app`, `/app/new` | Listado propio y creación de trabajos. |
| `/app/jobs/[id]`, `/app/jobs/[id]/edit` | Ver, editar y eliminar trabajos propios. Todo `/app` protegido. |
| Medios | Subir/ver fotos desde móvil; vídeos posteriormente. |

Cada trabajo: **nombre del vehículo o trabajo, fecha, código de pintura opcional y medios**. Nombre libre, sin catálogo de vehículos. No se han entregado fechas/códigos reales ni contacto de producción.

Fuera de alcance: clientes, matrículas como campo, estados, presupuestos, materiales, piezas, CRM, notas, descripciones adicionales, detalle público por trabajo y gestión multiusuario/roles. Búsqueda, filtros, selector de vistas, destacados y etiquetas antes/proceso/después del mockup no son funciones aprobadas. No añadir registro público ni catálogos.

## Modelo mínimo propuesto

Cuenta de Robin en `auth.users`, sin tabla propia de contraseñas/perfiles. Una cuenta posee trabajos; cada trabajo agrupa medios. Fotos del proceso pueden documentar retrospectivamente un trabajo terminado sin introducir estados.

| Entidad | Campos |
| --- | --- |
| `jobs` | `id` UUID PK, `owner_id` FK a Auth, `name` texto obligatorio, `job_date` date obligatorio, `paint_code` texto nullable, `created_at`/`updated_at` técnicos. |
| `job_media` | `id` UUID PK, `job_id` FK, `storage_path` único, `mime_type`, `position`, `width`/`height`, `byte_size`. |

Fecha de calendario sin conversión horaria; código alfanumérico, vacío normalizado a null. El propietario del medio se deriva del trabajo. Orden estable mediante `position`, sin exigir reordenación manual. Guardar rutas, no URLs firmadas ni binarios en PostgreSQL. V1 admite imágenes; revisar metadatos de vídeo después.

Proponer integridad referencial, nombre no vacío, tamaño/dimensiones positivos y posición no negativa/única por trabajo. Mínimo de fotos pendiente. Borrar metadatos no elimina archivos de Storage: coordinar limpieza y recuperación ante fallos.

## Arquitectura propuesta

Una aplicación Next.js App Router con React, TypeScript strict y Tailwind CSS; Supabase para Auth, PostgreSQL y Storage. Sin backend independiente, ORM, estado global ni servicios extra sin necesidad.

| Ubicación futura | Responsabilidad |
| --- | --- |
| `src/app/page.tsx`, `src/app/login/page.tsx` | Portfolio y acceso. |
| `src/app/app/` | Layout/listado privado; `new/page.tsx`, `jobs/[id]/page.tsx` y `jobs/[id]/edit/page.tsx` respetan las URLs anteriores. |
| `src/features/{jobs,portfolio}/` | Comportamiento, validación y datos; contrato público separado. |
| `src/components/`, `src/lib/supabase/` | UI compartida necesaria; clientes servidor/navegador separados. |
| `supabase/migrations/`, `tests/`, `e2e/` | Esquema/políticas, integración y recorridos; unitarias junto al comportamiento. |

Lecturas en servidor, cliente para interacción y Server Actions propuestas para mutaciones. Autorizar cada operación además del layout; evitar cachés públicas de datos privados. Gestión con sesión validada y RLS por propietario en tablas/Storage, sin claves privilegiadas para eludir políticas. Propuesta de acceso: cuenta aprovisionada, sin autorregistro, email/contraseña; confirmar identificador porque el mockup dice «Usuario».

**Publicación pendiente:** confirmar si todos los trabajos/medios son públicos. Recomiendo selección explícita y originales privados; una capa de servidor entregaría solo campos/medios autorizados. Si se aprueba, valorar `portfolio_media(media_id, position)` como relación técnica mínima, sin estados ni workflow editorial. Acordar selección y entrega antes de habilitar políticas públicas; hasta entonces, denegar exposición. Una URL firmada compartida concede acceso temporal.

Fundamentos verificados: [estructura Next.js](https://nextjs.org/docs/app/getting-started/project-structure), [autorización por operación](https://nextjs.org/docs/app/guides/authentication), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [buckets de Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals).

## Fases y aceptación propuestas

1. **Base técnica tras Gate 1:** resolver decisiones bloqueantes, inicializar stack/scripts y pruebas. Propuesta: Vitest para validación y Playwright para navegador, justificados por verificación. Salida: base con build/tipos/lint/pruebas ejecutables.
2. **Identidad y protección:** esquema, migraciones, Auth, RLS y Storage en desarrollo. Salida: anónimo, sesión caducada y usuario ajeno sin acceso privado, incluso por llamadas directas.
3. **Gestión móvil:** listado, alta, detalle, edición y borrado. Salida: ciclo persistido, campos mínimos, validación y errores recuperables.
4. **Fotos reales:** subida, galería y borrado coordinado. Salida: archivos inválidos rechazados, progreso/reintento y fallos parciales sin pérdida silenciosa; proporciones preservadas.
5. **Portfolio y escritorio:** contenido autorizado, contacto confirmado y composiciones por tamaño. Salida: una página pública, sin enlace privado, fotos ampliables dentro de `/` y WhatsApp comprobado.
6. **Verificación V1:** E2E, permisos reales, review de seguridad/accesibilidad, móvil real/escritorio y controles técnicos. Preparar despliegue al acordar destino. Vídeos en fase posterior.

TDD y review en cada incremento; seguridad desde el principio.

## Pendientes y riesgos

- Regla de publicación, campos visibles, portada y entrega/revocación de medios. Retirar una publicación no recupera copias descargadas.
- Identificador, aprovisionamiento/recuperación de Robin y contacto WhatsApp real. Datos de contacto del mockup sin confirmar.
- Guardado sin fotos, formatos/tamaño y máximo: «20 fotos» es ilustrativo. Gestionar fallos entre base de datos y Storage.
- Fotos con matrículas/entornos particulares; `result` no garantiza vehículo completamente montado. Seleccionar contenido publicable sin alterar originales.
- Dos homes móviles, edición móvil sin referencia propia y ausencia de hero panorámico: ver `DESIGN.md`.
- Versiones compatibles, gestor de paquetes y alojamiento al iniciar fase técnica; límites/costes de vídeo posteriormente.
