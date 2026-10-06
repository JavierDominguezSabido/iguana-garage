# Gate 3A — evidencia y límites

Fecha: 6 de octubre de 2026. Alcance autorizado por la solicitud del usuario: infraestructura Supabase/Next.js, modelo y seguridad, sin pantallas de producto. Proyecto remoto nuevo `iguana-garage`, expresamente autorizado para migraciones y fixtures temporales. **Gate 3A es verificable con el alcance acordado: las pruebas de nuestra implementación pasan; JWT expirado queda OMITIDO por decisión explícita del usuario, no PASS.**

## Aceptación y evidencia

| Criterio | Evidencia ejecutada | Resultado |
| --- | --- | --- |
| Trabajos/medios privados y aislados por propietario | `supabase/tests/authorization.sql` mediante `execute_sql` en el proyecto autorizado, roles `anon`/`authenticated`, `auth.uid()` y assertions activadas | PASS; transacción revertida |
| CRUD propio; A no lee/edita/borra B; no suplantación de propietario | Mismo SQL; assertions de filas/estado y errores de permisos | PASS |
| Publicación explícita y contrato sin `paint_code`/`owner_id`/rutas originales | SQL con trabajo privado, publicado y despublicado; test HTTP del RPC; parser unitario | PASS |
| Bucket original privado; otra identidad/anónimo sin lectura; INSERT solo en trabajo propio | SQL con roles reales y HTTP autenticado con transferencia/borrado de bytes | PASS; A descarga y limpia sus objetos, B/anónimo denegados |
| Descarga de derivados publicados sin listado público; revocación al despublicar | SQL con GUC `storage.operation` y prueba HTTP con bytes reales | PASS de RLS y API; publicación, descarga, denegación de listado/firma y revocación comprobadas |
| Registro público/anonymous sign-ins cerrados y esquema privado no expuesto | `npm run test:supabase:public`, Auth `/settings` y perfil REST `private` rechazado | PASS, 5 pruebas HTTP reales en total |
| Autenticación por contraseña, aislamiento entre A/B, CRUD, Storage y publicación | `npm run test:supabase`, cuentas temporales confirmadas y distintas | PASS, 4 pruebas autenticadas y 5 pruebas anónimas/configuración; limpieza confirmada |
| JWT auténtico caducado | Excluido del alcance por instrucción explícita del usuario | **OMITIDO, no PASS**: firma/caducidad son responsabilidad de Supabase; no las implementamos ni modificamos |
| Proxy bloquea peticiones privadas anónimas en producción | Smoke Playwright HTTP `.npm/gate3-proxy-smoke.mjs` contra `next start` | PASS: `/` 200; 4 peticiones `/app` redirigidas a `/login`, sin caché |

El SQL usa PostgreSQL/RLS real con fixtures Auth dentro de una transacción; configurar claims en esa conexión administrativa no equivale a emitir/verificar JWT ni a iniciar sesión por HTTP. Las unitarias SSR usan mocks exclusivamente para cookies/caché/errores; no se presentan como evidencia de autorización. La suite HTTP autenticada no usa mocks ni claves privilegiadas y requiere dos cuentas temporales confirmadas.

La aceptación conserva aislamiento RLS, CRUD propio, medios/Storage por propietario, publicación `is_public`, exclusión de `paint_code` y demás datos privados y bloqueo anónimo de superficies privadas. Se retiraron las comprobaciones de caducidad y criptografía mediante tokens alterados; no se exige ni conserva un fixture JWT. No se añaden pruebas de funcionamiento interno de Supabase salvo que nuestro código lo modifique o dependa de configuración propia. Registro público/anonymous sign-ins y límites MIME/tamaño de buckets sí se verifican porque son decisiones configuradas en este proyecto.

## RED → GREEN observado

- Configuración, validación y contrato: `npm test -- src/lib/supabase/config.test.ts src/features/jobs/validation.test.ts src/features/portfolio/contract.test.ts`. Tras declarar interfaces mínimas sin comportamiento: **28 failed / 20 passed**; implementación: **48 passed**. El fallo previo por módulos ausentes no se contabiliza como RED de comportamiento.
- SSR: `npm test -- src/lib/supabase/session.test.ts`: **10 failed → 10 passed**. Protección Secure en producción: **2 failed / 9 passed → 11 passed**.
- Esquema/seguridad: SQL de autorización preparado primero; RED real `42P01: relation public.jobs does not exist`. Tras la migración, se detectó `storage.protect_delete()`: Supabase impide borrar objetos por SQL. Se retiró esa operación del test SQL y se preparó su verificación HTTP, sin desactivar protecciones. Suite SQL final: `authorization_assertions=PASS`, `fixtures rolled back`.
- Auth remoto: la prueba de configuración detectó `disable_signup=false`; tras el ajuste humano del proyecto se confirmó `disable_signup=true`, `external.anonymous_users=false`; la misma prueba pasó.
- Smoke: se corrigió únicamente la expectativa de `Location` para aceptar redirección relativa del framework y verificar el mismo origen/ruta; repetición real PASS. Servidor local detenido.

Sin staging ni commits de TDD, respetando la instrucción explícita del usuario.

## Verificaciones técnicas ejecutadas

| Comando/comprobación | Resultado real |
| --- | --- |
| `npm ls --all` | exit 0; sin peers obligatorios inválidos; opcionales no instalados no requieren nuevas dependencias |
| `npm run typecheck` | PASS, Next typegen + TypeScript strict |
| `npm run lint` | PASS, 0 warnings; importación de tipo corregida tras un primer error de lint |
| `npm test` | PASS, 60 pruebas en 5 archivos |
| `npm run test:coverage` | PASS: líneas 97,43%; statements 95,09%; branches 93,70%; funciones 88,57% |
| `npm run test:supabase:public` | PASS, 5 pruebas reales; incluidas también en la ejecución final completa |
| `npm run test:supabase` | PASS, exit 0: 9 pruebas en 2 archivos (4 autenticadas + 5 anónimas/configuración); la expiración no forma parte de este recuento |
| `supabase/tests/authorization.sql` mediante conector del proyecto autorizado | PASS, `authorization_assertions=PASS`; fixtures revertidos |
| `npm run test:e2e:config` | PASS de configuración, 0 escenarios de UI; no equivale a E2E funcional |
| `npm run build` | PASS; solo `/`, not-found, icono y Proxy, sin pantallas nuevas |
| `node .npm/gate3-proxy-smoke.mjs` | PASS de 4 accesos privados anónimos, redirección al mismo origen y cache-control; servidor temporal detenido |
| `git diff --check` | PASS |
| Asesor Supabase de performance | 0 avisos |
| Asesor Supabase de security, consulta final | 1 aviso Auth: protección de contraseñas filtradas desactivada; ninguno sobre las tablas/políticas/funciones del proyecto |
| `npm audit --omit=dev` | PASS, 0 vulnerabilidades de producción |
| `npm audit --json` | exit 1: 5 entradas high en una cadena de desarrollo preexistente; ver detalle |

Cobertura calculada sobre validadores, contrato y helpers de comportamiento; no incluye tipos generados ni el wrapper declarativo de Proxy. El smoke verifica el wrapper real. SQL y HTTP prueban nuestra autorización independientemente del porcentaje de cobertura. La omisión de expiración no se contabiliza como prueba pasada.

## Security review

Revisados clientes y separación servidor/navegador, cookies Secure/SameSite y no-store, validación/normalización, RLS SELECT/INSERT/UPDATE/DELETE, permisos de columnas, rutas Storage y contract público. La gestión usa la identidad y RLS; no hay service-role ni secretos en la aplicación. Funciones de proyección pública acotadas en esquema no expuesto, sin SQL dinámico, con `search_path=''` y EXECUTE explícito. Sin lectura anónima de tablas, original público ni copia de assets. Pipeline de decodificación/derivación/limpieza aún fuera de esta fase; preparado y documentado, sin comunicar subidas exitosas inexistentes.

Revisión local: 71 archivos versionables, 41 de texto; sin coincidencias de secretos reales en patrones de claves privadas/proveedor, JWT o URLs de base de datos con contraseña, ni con las credenciales reales leídas exclusivamente en el entorno local. El literal de clave inválida del test del validador se revisó como fixture ficticio, no secreto. `.env.local` y `.env.integration.local` están ignorados; las plantillas contienen nombres y valores vacíos. SHA-256 confirma los 29 materiales originales y AGENTS.md/DESIGN.md sin cambios. `src/app/` y `.gitignore` no tienen diff; índice vacío y HEAD sigue en el checkpoint de foundation.

El asesor detectó inicialmente EXECUTE público de `public.rls_auto_enable()`, creado por la plataforma. Se corrigió mediante la segunda migración; se verificó que `anon` ya no puede ejecutarlo y los asesores dejaron de señalarlo.

Aviso Auth final: [Leaked Password Protection Disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). La función HIBP está disponible en Pro y superiores según documentación vigente; no se ha cambiado plan ni activado nada de pago. Decisión operativa pendiente para el aprovisionamiento de producción.

Aviso npm: `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`. El lockfile del checkpoint de foundation ya contenía esa versión, y npm confirma 3.0.3 como última estable. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) indica versiones <=3.0.3 afectadas y ninguna versión parcheada. Las 5 entradas de npm corresponden a esa cadena de desarrollo, no a 5 fallos independientes de Supabase. No se aplicó `audit fix --force`, downgrade de Next ni overrides sin parche real. Deuda temporal de seguridad en herramientas de desarrollo, separada del bloqueo aceptado de ESLint 10.

## Operaciones posteriores y límites

No faltan credenciales ni pruebas de la implementación acordada. Restaurar manualmente el JWT expiry remoto de **300 a 3600 segundos**: el usuario lo redujo temporalmente para una prueba que ha decidido omitir. La aplicación conserva la validación de identidad contra Auth y RLS; no admite tokens caducados mediante validación propia.

Limpieza comprobada mediante consulta remota después de SQL/HTTP: `jobs=0`, `job_media=0`, objetos en ambos buckets `=0`, usuarios sintéticos del SQL `=0`. Las dos cuentas temporales aprovisionadas por el usuario se conservan para que pueda retirarlas desde Dashboard al terminar; no se borraron cuentas existentes. Se retiraron el JWT local y la herramienta temporal que lo obtenía. Sin secretos en chat/logs. El registro remoto sigue cerrado.

No hay Docker instalado, por lo que no se ha arrancado ni verificado un stack Supabase local. La integración SQL/HTTP anónima ejecutada es remota y específica del proyecto autorizado. Las migraciones, configuración local y pruebas están versionables para reproducción posterior.

Skills utilizadas: ECC `ecc-guide`, `intent-driven-development`, `tdd-workflow`, `security-review`, `verification-loop`; skill oficial `supabase` para docs actuales, CLI/migraciones y revisión específica. Sin agentes, instalación global de ECC, interfaces, staging, commit ni push.
