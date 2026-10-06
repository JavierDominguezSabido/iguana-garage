# Iguana Garage V1 — preproducción y readiness

Auditoría ECC: **82/100, preparada con reservas operativas**. El código y los recorridos críticos están verificados en producción local; faltan acceso al host, URL HTTPS, cuenta real y comprobación física. La puntuación es una valoración de la evidencia disponible, no una certificación; queda por debajo de 85 porque no hay CI remoto ni deployment comprobado.

Fecha: 6 de octubre de 2026. Base aprobada: `9eba03e9d1f6ed1fb13407064417e1101a2f873f`, rama `main`, inicialmente limpia, sin remote. Este bloque no crea staging, commit ni push.

## Alcance y cambios

Se revisaron AGENTS, PRODUCT, DESIGN, README, informes previos, dependencias/scripts, límites cliente/servidor, Auth por operación, RLS, SQL/RPC, Storage, transformación/entrega de imágenes, revocación, origen de mutaciones, headers, SEO, estado vacío, recuperación y recorridos públicos/privados. No se cambia producto, diseño, arquitectura, dependencias, modelo ni políticas.

Cambios concretos:

1. **Defecto de subida:** el proxy de Next truncaba una petición multipart con un archivo válido de 10 MiB porque su límite predeterminado también era 10 MiB. Se configura `proxyClientMaxBodySize = 10 * 1024 * 1024 + 64_000`, igual al margen de lectura del Route Handler. El archivo sigue limitado a 10 MiB; no se amplían formatos, píxeles ni buckets.
2. **Hardening de documentos:** CSP con nonce por petición transmitido a Next para scripts y estilos SSR; sin `unsafe-inline` en scripts y sin `unsafe-eval` en producción. `style-src-attr 'unsafe-inline'` es la excepción limitada para los atributos de Next/Image y elementos existentes; no permite JavaScript inline. `connect-src` acepta el propio sitio y la URL Supabase validada. Ante configuración ausente, la política permanece cerrada y deja que Auth/DAL comuniquen su error anterior.
3. **Cabeceras globales:** nosniff, DENY para marcos, referrer `strict-origin-when-cross-origin`, HSTS de un año y permisos de geolocalización/micrófono/pago deshabilitados. No se bloquea cámara para no interferir con el selector nativo del móvil. HSTS no tiene preload ni includeSubDomains; `upgrade-insecure-requests` solo se aplica cuando la petición llega por HTTPS, preservando el smoke HTTP local. `X-Powered-By` deshabilitado.
4. **QA compatible con CSP:** axe se inyecta con el nonce del documento y los recorridos comprueban infracciones CSP. Cobertura incluye el proxy. Se añaden regresiones del margen de subida, cabeceras/hidratación y tratamiento de configuración.
5. **Runtime y entrega:** `.node-version` fija la versión ya comprobada, 24.18.0; README actualizado al checkpoint real; guía de uso/hardware/entrega y este informe.

No se ha creado infraestructura global ECC ni instalado paquetes, agentes o CLIs adicionales. Skills aplicadas: `ecc-guide`, `production-audit`, `security-review`, `deployment-patterns`, `tdd-workflow` para los defectos/configuración propia y `verification-loop`. El conector Supabase se usa solo en Iguana Garage. Sites se evaluó y no procede para migrar este proyecto Next existente.

## Seguridad, Supabase y operación

Proyecto único auditado: **iguana-garage**, `atibisongftmspwtyndv`, PostgreSQL 17, región eu-west-1, plan Free. LiftTrack no se usa ni modifica.

- Las dos migraciones existentes constan aplicadas: `20261006061544_gate3a_jobs_security` y `20261006061818_gate3a_platform_function_hardening`. No hay migración nueva ni rollback de datos en este bloque.
- RLS activo en `jobs`, `job_media` y `storage.objects`. Lecturas/mutaciones privadas usan identidad validada por Auth y políticas de propietario; UUID y rutas de medios se validan. Cada DAL/endpoint autoriza, además del proxy/layout.
- SQL/RPC: `search_path` vacío en funciones propias; los únicos SECURITY DEFINER de negocio son las proyecciones públicas limitadas. `list_public_jobs` es invoker; permisos de funciones privadas de propietario solo para authenticated. El trigger de plataforma endurecido solo es ejecutable por postgres. Índices de propietario/fecha, publicación/fecha y job/posición presentes; performance advisors sin avisos.
- Contrato público: `id`, `name`, `job_date`, `media` con `id/path` de derivado. Sin `paint_code`, propietario, credenciales ni rutas de originales. La proyección solo admite `is_public` y derivados existentes. No hay SELECT anónimo general de tablas privadas.
- `job-originals`: privado, 10 MiB, JPEG/PNG/WebP. `portfolio-derivatives`: privado, 5 MiB, WebP. Download público condicionado a publicación autorizada y a operación de descarga; no permite listar arbitrariamente el bucket. No se generan URLs firmadas públicas.
- Entrega propia consulta autorización en cada petición, con no-store en navegador/CDN, tamaños acotados y errores genéricos. El optimizador de Next no admite las rutas públicas revocables. Retirar la publicación deniega nuevas descargas en la misma URL; no puede borrar copias ya descargadas por terceros.
- Publicación/retirada y borrado conservan el orden y la recuperación existentes. Fallos de subida conservan el formulario/trabajo privado y permiten reintentar. Borrar un trabajo elimina derivados, originales y metadatos asociados; no se comunica éxito incompleto.
- Auth remoto, consultado por su endpoint de settings: email/password habilitado, signup deshabilitado, usuarios anónimos deshabilitados, OAuth y teléfono deshabilitados. Dos cuentas temporales confirmadas permanecen para QA; no se creó la cuenta de Robin ni se eliminaron usuarios durante las pruebas.
- JWT expiry: el usuario confirmó la restauración remota a **3600 segundos**; el TOML local también declara 3600. El conector no permite leer el ajuste remoto de expiry ni Site/Redirect URLs: revisión final en Dashboard. La prueba de JWT expirado sigue **OMITIDA por decisión del usuario**, no PASS. No se revalida criptografía o caducidad interna de Supabase.
- Cookies Secure en producción, autorización remota getUser, sesión no-store y logout verificados. El smoke confirma que tras logout no quedan cookies de sesión Supabase y `/app` vuelve a pedir acceso.
- La comparación de origen admite el Host real con `x-forwarded-proto: https` y rechaza un origen ajeno o downgrade HTTP. No confía en `x-forwarded-host` para ampliar destinos. Comprobación local con proxy HTTPS simulado devuelve redirección relativa `/login`; falta el smoke en el host real. El proxy del host debe preservar Host y fijar el protocolo; no exponer Node directamente por HTTP en producción.
- Security advisor: un WARN, protección de contraseñas filtradas deshabilitada. Está [disponible en Pro o superior](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); no se cambia el plan Free ni se finge corregido. Mitigación operativa: cuenta manual y contraseña larga, única, generada con gestor. No equivale a protección automática contra filtraciones.

**Limpieza:** después de las pruebas, `jobs=0`, `job_media=0`, `storage.objects=0`; los dos usuarios de pruebas siguen confirmados. Los fixtures publicados y sus fotos se eliminaron mediante su propietario. No hay datos demo permanentes, seeds automáticos ni copias de demo en `public/`.

## Imágenes, SEO y QA mobile-first

El original se conserva byte a byte y privado. El procesado propio valida firma/MIME/bytes, limita decodificación a 40 millones de píxeles, rechaza animaciones, orienta por EXIF y genera WebP dentro de 1600×1600 sin ampliar ni recortar. Los derivados no conservan EXIF. Las variantes públicas tampoco amplían ni deforman.

Además de las unitarias y E2E existentes, se ejecutó una matriz con las funciones reales y una foto demo transformada únicamente en memoria: 1200×1600, 1600×1200, 1800×2400, 2400×1800, 1920×1080, 1080×1920, 1200×1200 y 400×1600. Ocho casos correctos: 3:4, 4:3, 16:9, 9:16, cuadrada y estrecha; límites/proporciones conservados, derivados WebP sin EXIF y buffer original sin mutación. La regresión HTTP confirma el SHA-256 del original de 10 MiB descargado con su propietario.

QA efectuado en orden **390 → 768 → 1440**, producción local en Chrome: login/logout y errores de acceso, bloqueo anónimo y usuario ajeno, vacío, alta, selector múltiple, formulario, recuperación tras fallo de red, detalle, edición, publicación/retirada, borrado y galería. Público: hero, transición, fotografías, imágenes completas verticales/horizontales, CTA/contacto pendiente, navegación, pie y vacío. Axe sin infracciones automáticas; targets revisados >=44 px; sin overflow. Inputs reales del formulario: tres campos, todos de 16 px y 52 px de alto. Sin cambios de CSS, identidad ni composición aprobada.

Capturas revisadas en `.npm/preprod-e2e-390`, `-768`, `-1440`; el smoke vacío y las capturas de login/listado vacío están en `.npm/preprod-runtime-review`. Evidencias ignoradas, no versionables. Las capturas viewport/modal son fiables; permanece el artefacto conocido de algunas capturas fullPage con imágenes negras. No se modifica la página por ese artefacto. El enlace accesible “Ir al contenido” puede aparecer en capturas con foco de teclado; es el comportamiento previsto.

Smoke local adicional: cero errores inesperados 404/5xx, consola, JavaScript o CSP; favicon SHA-256 idéntico al símbolo oficial. Se observaron cancelaciones `net::ERR_ABORTED` al navegar/cerrar peticiones y un mensaje de stream cerrado durante el E2E de escritorio; los recorridos finalizan sin error y el smoke estable no produce errores de servidor ni respuestas 5xx. No se atribuyen esas cancelaciones a un fallo de carga de las fotografías.

SEO comprobado: título y descripción, OG/Twitter, `lang=es`, viewport correcto, estructura semántica, favicon oficial. `/login`, `/app/**` y superficies de imagen no se promocionan para indexación (`X-Robots-Tag`). La home pública sí es indexable. Canonical, metadataBase y URLs OG absolutas permanecen pendientes de una URL real; no se inventan dominio, dirección ni datos estructurados. No se necesita un callback OAuth ni una nueva ruta de Auth para el login actual.

Performance de laboratorio local, **sin throttling y sin deployment HTTPS**:

| Superficie | 390 px | 768 px | 1440 px |
| --- | --- | --- | --- |
| Home vacía, LCP observado | 604 ms | 380 ms | 376 ms |
| Home vacía, CLS | 0 | 0 | 0 |
| JavaScript transferido medido | 142.214 bytes | 142.214 bytes | 142.214 bytes |

El E2E publicado comprueba CLS <0,1 en los tres tamaños; el informe guardado de escritorio registra CLS 0, LCP 628 ms y 142.214 bytes JS. Son muestras locales, no percentiles de usuarios ni garantías de rendimiento móvil. Solo el hero con foto se precarga; fotos siguientes usan tamaños propios/lazy y las galerías reservan geometría. Fuentes de sistema, sin fuentes remotas. Hace falta medir red/HTTPS y memoria real en el host antes de dar producción por comprobada.

Android físico y Safari/iPhone no se probaron. La checklist práctica de 2–5 minutos está en [production-handoff.md](production-handoff.md).

## Variables y deployment preparado

No se añaden variables de negocio. Las dos plantillas conservan valores vacíos; `.env.local` y `.env.integration.local` siguen ignorados y no están en el índice.

| Variable | Clasificación | Uso/producción |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | PUBLIC, diseñada para navegador | Obligatoria en build y runtime; URL del proyecto autorizado |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | PUBLIC, diseñada para navegador | Obligatoria en build y runtime; clave publicable, nunca clave privilegiada |
| `IGUANA_WHATSAPP_NUMBER` | SERVER-ONLY, dato público de contacto | Número real E.164 con `+`, código internacional y dígitos; necesario para activar contacto. Sin configurar ahora; fallback correcto |
| `SUPABASE_TEST_PROJECT_REF` | TEST-ONLY / LOCAL-ONLY | Identificación del proyecto dedicado de QA, no subir al host |
| `SUPABASE_TEST_DISPOSABLE` | TEST-ONLY / LOCAL-ONLY | Permiso de crear/limpiar fixtures en desarrollo, no subir al host |
| `SUPABASE_TEST_USER_A_EMAIL`, `SUPABASE_TEST_USER_A_PASSWORD` | TEST-ONLY / LOCAL-ONLY, credenciales | Solo fichero local ignorado; nunca cliente, build de aplicación, documentación ni host |
| `SUPABASE_TEST_USER_B_EMAIL`, `SUPABASE_TEST_USER_B_PASSWORD` | TEST-ONLY / LOCAL-ONLY, credenciales | Igual para el segundo propietario de QA |
| `NODE_ENV`, `PORT` | Runtime del host | Producción y puerto asignado por el servicio, no secretos ni variables nuevas del producto |

`IGUANA_WHATSAPP_NUMBER` se lee en el servidor y construye ambos CTA mediante la misma función validada. El número final y su enlace son públicos al configurarlo, aunque la variable no es NEXT_PUBLIC. No hay número inventado ni enlaces wa.me/tel falsos. No se necesita service-role ni contraseña de base de datos para ejecutar la app.

**Target: Render Web Service, Node completo.** Next ofrece SSR/Proxy/Route Handlers y Sharp requiere runtime nativo; se conserva la arquitectura. Render [documenta Next como servicio Node](https://render.com/docs/deploy-nextjs-app). Vercel Functions limita [peticiones/respuestas a 4,5 MB](https://vercel.com/docs/functions/limitations), inferior a los originales de 10 MiB que cruzan nuestro servidor. No se fuerza ese destino ni se sustituye el pipeline por subida directa al bucket.

Configuración exacta para un servicio nuevo, una vez aprobado su acceso/origen de código:

| Campo del host | Valor |
| --- | --- |
| Servicio/framework | Web Service, Node, Next.js App Router; no Static Site |
| Root directory | Raíz de este proyecto |
| Node | 24.18.0 mediante `.node-version`; engines limita a Node 24 |
| npm | 11; packageManager documenta 11.16.0; instalación reproducible con lockfile |
| Build command | `npm ci --include=dev && npm run build` |
| Start command | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Output | `.next`, servido por Next; no publish directory `out` |
| Variables | Las dos NEXT_PUBLIC Supabase antes de build y en runtime; WhatsApp real en runtime |
| Health check | `/`, sin crear una ruta/feature nueva; comprobar Supabase aparte en el smoke |
| Autodeploy | Off hasta aprobar el primer deployment y su smoke |
| Persistencia | Datos/fotos en Supabase; sin disco local persistente nuevo |
| TLS/origen | HTTPS del host; Host conservado y protocolo reenviado correctamente |

No se aprovisionó un plan de pago ni una cuenta. La elección de compute/memoria y la recepción real de multipart deben comprobarse en el host: una foto de 10 MiB y una de resolución habitual de teléfono, con el flujo de desarrollo seguro. No se presenta como medida una capacidad del proxy/memoria remoto que todavía no se ha probado. Free puede servir para preview, con sus límites y arranque en frío; no es una garantía de uso diario de producción. [Planes/recursos del servicio](https://render.com/docs/blueprint-spec#plan).

**Estado:** no hay remote Git, CLI/sesión/token de Vercel/Render/Railway disponibles ni URL de producción. No se hizo deployment ni smoke HTTPS. No se publicará el repo sin autorización. Después de aprobar el checkpoint y elegir un repositorio privado real, el proceso pendiente es vincularlo como origen de Render; configurar el remote con esa URL real y publicar código requerirá autorización explícita. No se crea un nombre o URL de repositorio por deducción.

Cuando exista URL:

1. Supabase Dashboard → Authentication → URL Configuration: **Site URL** = URL HTTPS real. Login/password actual no requiere Redirect URLs adicionales. Mantener solo destinos exactos realmente usados para comunicaciones Auth; no añadir comodines generales ni un `/auth/callback` que esta V1 no implementa. Desarrollo local se mantiene solo si corresponde al uso real.
2. Configurar canonical/metadataBase/OG absoluto con esa dirección; el TOML actual conserva su Site URL local y no acredita configuración remota.
3. Smoke HTTPS primero a 390 px: home vacía, assets/icono, contacto, navegación, login, `/app` anónimo bloqueado, sesión/cookies/logout y origen de mutaciones. Comprobar CSP, mixed content, 404/5xx, fotos, tiempos y memoria. Los fixtures, si hacen falta, solo en desarrollo/staging y con limpieza confirmada.
4. Crear manualmente a Robin en Auth con email confirmado y contraseña segura; validar acceso real antes de borrar/deshabilitar las dos cuentas de pruebas. No se inventa email ni se envía contraseña por chat.

**Rollback básico:** este bloque no cambia DB/RLS/Storage. Si un deployment falla, detener su promoción y volver al build anterior aprobado desde un checkout separado, preservando las variables y Supabase; no resetear el trabajo local ni restaurar DB por un fallo frontend. Tras un primer deployment correcto, Render permite [rollback a un deployment previo](https://render.com/docs/rollbacks); comprobar login y home de nuevo. Los restores de datos se valoran por separado y requieren copia conocida, incluidos archivos Storage. No se ha ejecutado rollback remoto ni restore destructivo.

Siguiente acción humana concreta: **Javier, habilitar el acceso autenticado a Render y vincular el origen privado de código elegido para Iguana Garage después de aprobar este bloque**, sin compartir tokens en el chat. El resto de la activación (WhatsApp, Robin, URL/Auth y teléfono real) está agrupado en la checklist de entrega; no bloqueó el resto del trabajo técnico.

## Verificación real y límites

TDD observado:

- Headers/CSP: tres unitarias RED por política ausente y smoke RED por falta de nosniff; implementación GREEN. Configuración ausente: una regresión adicional RED por excepción anticipada; política cerrada y comportamiento previo conservados, cuatro unitarias GREEN.
- Multipart: foto PNG válida derivada de demo solo en memoria y completada hasta 10 MiB mediante chunk auxiliar válido. HTTP RED 400 con aviso de truncamiento Next; tras el margen, GREEN 200 y original descargado con tamaño/SHA-256 exactos. Fixture eliminado. No se prueba comportamiento criptográfico de plataforma.
- Una ejecución intermedia de build detectó un cast faltante del harness E2E; corregido. El smoke auxiliar se corrigió para esperar al formulario y medir sus tres campos, evitando afirmar comprobaciones sobre una lista vacía.

| Comando/comprobación ejecutado | Resultado |
| --- | --- |
| `npm ls --all` | PASS, exit 0; árbol completo guardado en `.npm/preprod-npm-tree.txt`, sin peers obligatorios inválidos |
| `npm run typecheck` | PASS, strict |
| `npm run lint` | PASS, 0 warnings |
| `npm test` | PASS, 121 pruebas / 12 archivos |
| `npm run test:coverage` | PASS: líneas 98,10%; statements 94,76%; ramas 93,51%; funciones 90,56%, umbrales >=80% |
| `npm run test:supabase` | PASS, 9 pruebas reales / 2 archivos, RLS/CRUD/Storage/publicación y exclusión de campos privados |
| `npm run test:e2e:config` | PASS, lista 12 combinaciones / 3 archivos / 3 tamaños |
| `npm run test:e2e -- --project=mobile-390 --output=.npm/preprod-e2e-390` | PASS, 4/4 |
| `npm run test:e2e -- --project=tablet-768 --output=.npm/preprod-e2e-768` | PASS, 3/3; 1 OMITIDA por repetir el mismo límite del servidor |
| `npm run test:e2e -- --project=desktop-1440 --output=.npm/preprod-e2e-1440 --reporter=list,json` | PASS, 3/3; misma omisión declarada |
| `npm run test:e2e -- e2e/preproduction.spec.ts --output=.npm/preprod-final-headers` | PASS en el último build, 4/4 comprobaciones; 2 OMITIDAS por no duplicar el límite del servidor |
| `npm run build` | PASS, Turbopack/SSR; home/login/privado y endpoints dinámicos, icono y 404 estáticos |
| `npm run start -- --hostname 0.0.0.0 --port 3100` | PASS, listo en ~200 ms; smoke usa esta forma de arranque |
| Matriz de imágenes propia y smoke auxiliar local | PASS, ocho proporciones y 390/768/1440; evidencias ignoradas |
| `npm audit --omit=dev --json` | PASS, exit 0, 0 vulnerabilidades de producción |
| `npm audit --json` | exit 1: 5 paquetes HIGH en una única cadena dev de `braces`; no PASS global |
| Advisors de Supabase | Security: 1 WARN conocido; performance: 0 |
| Secretos, bundles, env ignorados e integridad | PASS: 123 archivos versionables / 93 de texto, cero coincidencias de secretos; 19 bundles de texto sin credenciales privadas; 32 hashes protegidos coinciden; plantillas vacías y env locales ignorados |
| `git diff --check`, `git status` | PASS en el diff revisado; 6 archivos modificados y 5 nuevos legítimos, índice vacío, sin staging/commit/push |

Los cinco archivos nuevos se comprobaron además sin espacios finales y con newline final. `git diff --no-index --check NUL <archivo>` no emitió diagnósticos de whitespace y devolvió 1 por la diferencia contra NUL; no se confunde ese código con un PASS de comando. La comprobación independiente de espacios/newline devolvió PASS.

Avisos de desarrollo: `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`. Una vulnerabilidad transitiva de agotamiento de stack por patrones anidados, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), propagada a cinco paquetes; estos módulos no son llamados por los recorridos de producción ni enviados al navegador. npm propone bajar eslint-config-next a 14.2.35, una regresión mayor incompatible con la base aceptada. No se aplica `audit fix --force`, override sin parche ni downgrade. Las dependencias y lockfile permanecen iguales. ESLint 9.39.5 conserva la deuda aceptada por peers de React/import/jsx-a11y.

Build informa que `proxyClientMaxBodySize` es experimental en esta versión; es necesario para el margen probado y no indica un fallo. Los warnings NO_COLOR/FORCE_COLOR proceden del harness de consola; no se cambia la aplicación para silenciarlos. Los avisos de conversión LF/CRLF de Git no implican corrupción; hashes protegidos y diff de espacios se comprueban aparte.

Versiones finales intactas: Node 24.18.0, npm 11.16.0, Next/eslint-config-next 16.3.8, React/DOM 19.3.0, TS 6.0.3, Tailwind 4.3.3, ESLint 9.39.5, Supabase JS 2.117.2/SSR 0.12.7, Sharp 0.35.5, Vitest 5.0.3, Playwright 1.63.0; resto en package.json/lock.

Deuda restante real: ESLint y advisory dev; protección de contraseñas filtradas limitada por Free; propiedad experimental de Next; límites reales de compute/proxy por comprobar al desplegar; ausencia de CI remoto/HTTPS/canonical definitivo y hardware; recuperación entre servicios no atómica y respaldo Free. No se construye infraestructura de backup propia. Supabase [no incluye archivos de Storage en backups de DB y recomienda exportaciones en Free](https://supabase.com/docs/guides/platform/backups); conservar también originales fuera de la app. Borrar un trabajo elimina fotos y requiere cautela.

## Archivos e higiene Git

Modificados: README, `next.config.ts`, `src/proxy.ts`, `vitest.config.ts`, `e2e/private-app.spec.ts`, `e2e/public-portfolio.spec.ts`.

Nuevos: `.node-version`, `src/proxy.test.ts`, `e2e/preproduction.spec.ts`, `docs/production-handoff.md`, este informe. Son 11 archivos legítimos; caches, capturas y scripts auxiliares permanecen bajo `.npm/` ignorado. No se versionan secretos, credenciales, fixtures ni resultados de pruebas.

Estado Git al cierre:

```text
 M README.md
 M e2e/private-app.spec.ts
 M e2e/public-portfolio.spec.ts
 M next.config.ts
 M src/proxy.ts
 M vitest.config.ts
?? .node-version
?? docs/preproduction-verification.md
?? docs/production-handoff.md
?? e2e/preproduction.spec.ts
?? src/proxy.test.ts
```

Confirmaciones finales: índice vacío; HEAD base preservado; sin remote/push/commit. AGENTS, PRODUCT, DESIGN, assets/brand, assets/demo y references conservados; 32 hashes protegidos sin cambios. El informe y la checklist cubren los 31 puntos solicitados: auditoría/cambios/seguridad/Supabase/Auth/Storage/imágenes/QA, variables/contacto/deployment/URL/pendientes, pruebas/build/performance/dependencias/advisors, Robin/cuentas/hardware/entrega/deuda y diff/status/integridad. La activación externa pendiente nunca se presenta como PASS.
