# Área privada MVP — decisiones y verificación

Bloque autorizado sobre `aa35c011bb28258f42af520ab354f53da3383cda`. Rutas: `/login`, `/app`, `/app/new`, `/app/jobs/[id]`, `/app/jobs/[id]/edit`. Home pública, vídeo, perfiles, roles y campos adicionales quedan fuera de alcance.

## Arquitectura

- Login/logout: Server Actions con cliente SSR escribible y cookies; no registro. Login validado redirige a `/app`; todas las páginas y operaciones privadas validan identidad además de Proxy/RLS. Lecturas servidor y rutas de imágenes con `private, no-store`.
- DAL concreto `src/features/jobs/data.ts` para trabajos/medios. Route Handlers bajo `/app/api/`; nunca service-role. Validación de UUID, propietario, datos y origen de mutaciones mediante Host/protocolo recibidos. Tablas, grants, políticas y configuración Supabase de Gate 3A intactos.
- Guardado: preparar datos como privados → eliminar fotos solicitadas → subir fotos pendientes → normalizar posiciones → confirmar publicación. UUID estable del trabajo y de cada foto permite reintentar sin duplicar después de perder una respuesta. No se afirma guardado privado si el servidor no confirmó la preparación. El progreso es estado local de transporte, sin estados de negocio añadidos a PostgreSQL.
- Subida por imagen con límite real del cuerpo, incluso sin Content-Length. JPEG/PNG/WebP, 10 MiB y 40 megapíxeles, sin animación. Sharp 0.35.5 decodifica, orienta y genera WebP hasta 1600 × 1600 conservando proporción, sin EXIF/metadata, máximo 5 MiB. Original intacto en bucket privado; derivado separado también privado. Todas las fotos generan derivado para permitir publicar después. El checkbox informa que hay que revisar matrículas y datos visibles; no implica edición automática del contenido de la foto.
- Fallo parcial: detener, conservar progreso y referencias y comunicar que falta terminar. Una subida con original/metadata guardados y derivado pendiente se reanuda con el mismo ID; al publicar se puede regenerar el derivado desde el original. Borrado despublica primero, elimina copias y solo después metadata/trabajo; también revisa originales huérfanos del mismo ámbito. No existe transacción distribuida entre Storage y PostgreSQL.
- UI primero a 390 px; a 768 px formulario/detalle en columnas y a 1440 px listado en tres columnas. Identidad oficial importada como PNG sin cambios. Fullscreen de galería conserva proporción y permite teclado/escape. No exige un mínimo de fotos; no impone el límite ilustrativo de 20 del mockup.
- Sharp se declara directo porque nuestro código lo usa, aunque Next ya lo instalaba transitivamente. axe-core 4.14.0 es solo herramienta de desarrollo. Sin librerías visuales ni estado global.

## TDD observado

- Workflow/limpieza/procesado: 7 fallos de comportamiento → 7 PASS. Orden de operaciones, recuperación sin duplicar, no borrar metadata ante fallos de buckets, MIME real, datos truncados, orientación, retirada de EXIF, tamaño/proporción del derivado y límite de píxeles.
- Límite de cuerpo: 1 failed / 1 passed → 2 PASS; chunks sin Content-Length también quedan acotados.
- Origen: 1 failed / 3 passed → 4 PASS; corrigió un rechazo real del navegador porque Next normaliza la URL interna.
- Preparación sin confirmación: 1 failed / 4 passed → 5 PASS del workflow; no comunicar publicación retirada/guardado privado sin ACK.

## QA y verificaciones

La integración HTTP de Gate 3A continúa probando nuestra configuración/RLS/Storage; no se revalida criptografía ni caducidad de Supabase. Unitarias cubren lógica propia; DAL/Auth/Route Handlers se verifican mediante integración/E2E real, no se fuerza cobertura mediante mocks de autorización.

QA usa Chrome real con cuentas temporales del proyecto `iguana-garage`, fotos reales originales y adaptaciones en memoria para JPEG/horizontal PNG. Fixtures UUID aislados. Capturas en `test-results/` ignorado: login sin credenciales, alta, listado, detalle y edición a 390/768/1440. Sin traces/HAR. Revisa overflow, imágenes visibles, axe WCAG 2/2.1/2.2 A/AA, targets de 44 px y galería con Enter/Escape. No existe baseline automático de comparación de píxeles; se inspeccionan las capturas actuales frente a la dirección de diseño.

| Comprobación ejecutada | Resultado |
| --- | --- |
| `npm run typecheck` | PASS, strict |
| `npm run lint` | PASS, 0 warnings |
| `npm test` | PASS, 74 pruebas / 9 archivos |
| `npm run test:coverage` | PASS: líneas 98,40%; statements 95,26%; ramas 92,85%; funciones 90,47% |
| `npm run test:supabase` | PASS, 9 pruebas HTTP reales de nuestra configuración/políticas |
| `npm run build` | PASS, rutas privadas dinámicas y home vacía |
| `npm run test:e2e` | PASS, 3 recorridos completos en Chrome: 390/768/1440 px |
| `npm run test:e2e:config` | PASS, detecta los 3 proyectos/recorridos |
| axe WCAG A/AA, targets y overflow dentro del E2E | 0 infracciones automáticas en login/alta/listado/detalle/edición; targets verificados >=44 px y sin overflow |
| `npm ls --all` | exit 0, sin peers obligatorios inválidos |
| `npm audit --omit=dev` | exit 0, 0 vulnerabilidades de producción |
| `git diff --check` y revisión local de archivos nuevos | PASS |
| Secretos | 104 archivos versionables / 74 de texto, 0 coincidencias de secretos reales; `.env` locales ignorados |
| SHA-256 de materiales/instrucciones protegidos | 31/31 intactos: 17 assets, 12 referencias, AGENTS y DESIGN |
| Limpieza remota tras E2E e integración | jobs=0, job_media=0, objetos en ambos buckets=0 |
| Git | HEAD sigue en `aa35c011bb28258f42af520ab354f53da3383cda`; índice vacío |

Cada tamaño recorre login/logout, bloqueo anónimo, listado, alta, fotos, galería, edición, publicación/retirada, confirmación/cancelación de borrado y eliminación completa. Móvil comprueba además selector múltiple/eliminación antes de guardar, fallo de red durante subida y reintento sobre el mismo trabajo y la misma foto. B no puede borrar por nuestro endpoint ni ver el trabajo de A. El RPC público se verifica sin campos privados y se comprueba descarga/revocación de derivados. No se modificó ni probó criptografía/caducidad interna de Supabase.

Problemas encontrados y resueltos: rechazo de origen legítimo por comparar con URL interna; límite de bytes insuficiente para peticiones sin Content-Length; mensaje de guardado sin ACK; label visible/accesible de la galería discordante (axe); botón de guardar móvil partido en dos líneas; singular del contador. Se corrigieron expectativas del QA sobre el anunciador de rutas, imágenes ocultas con lazy loading y status HTTP de una respuesta RSC transmitida: se valida la denegación y ausencia de datos, no esos detalles internos del framework. Una primera limpieza de QA por APIRequestContext no envió las cookies Secure del loopback; se corrigió para usar el navegador. Se eliminó explícitamente el fixture de esa ejecución mediante la identidad A y se comprobó limpieza final.

La revisión de seguridad cubre identidad por operación, CSRF/origen, límites de lectura/decodificación, UUID/rutas, proyección pública, no-store, ausencia de claves privilegiadas, recuperación y orden de borrado. No hay nuevas migraciones, cambios de políticas, modificaciones de materiales ni copia pública de fotografías demo.

Archivos del bloque: README, package.json/lock, Playwright/Vitest, CSS y documentación Supabase; nuevo informe, un E2E, 13 archivos de rutas/layout/estados, 2 componentes de identidad/iconos, 2 archivos Auth y 14 archivos de datos/formulario/galería/validación de transporte/procesado/workflow/pruebas.

## Límites y deuda

- Datos/bytes no son atómicos entre servicios: la recuperación prioriza reintentos y referencias conservadas. Con fallo de limpieza se debe reintentar; no se comunica eliminación completa.
- QA emula tamaños/tacto en Chrome sobre Windows. No se ha probado hardware físico, Safari/iOS ni lector de pantalla; axe limpio no equivale a certificación WCAG exhaustiva.
- Permanecen la deuda aceptada de ESLint 9, el aviso npm de la cadena de desarrollo y la decisión operativa de protección de contraseñas filtradas del proyecto. Ninguna implica abrir RLS ni usar claves privilegiadas.
- Cuenta definitiva de Robin/aprovisionamiento de producción, despliegue y portfolio completo pertenecen a fases posteriores. No hay staging/commit/push en este bloque.

ECC aplicado: guía, aceptación, TDD, dirección visual, browser QA, revisión de seguridad y verification-loop; skill Supabase para la infraestructura vigente. Sin agentes ni instalación/configuración global adicional.
