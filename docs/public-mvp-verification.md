# Portfolio público y cierre V1 — informe de revisión

Bloque autorizado sobre `76967ca3cd4d835c36f2cddd2c04c6aa85393bc6`. Sin staging, commit ni push. Fecha de verificación: 6 de octubre de 2026.

## 1. Resultado global

Home `/` completa y conectada con Supabase real: identidad, hero, trabajos publicados, ampliación de fotos en la propia página, contacto, footer y estados. El área privada aceptada se conserva. No hay páginas públicas individuales, funcionalidades de vídeo, CMS, registro, nuevas entidades ni secciones ficticias.

Los trabajos de QA se publicaron realmente con fotografías del taller, y se eliminaron al terminar. El proyecto queda vacío: no se dejan nombres/fechas de prueba como contenido de producción. Robin debe registrar y publicar los trabajos que quiera mostrar.

## 2–4. Móvil, tablet y escritorio

- **390 px, experiencia primaria:** header compacto con navegación directa, CTA temprano, hero contenido, trabajos en una columna con fotos grandes y galería táctil/teclado. Sin hamburguesa ni enlaces privados. Se comprobó además ausencia de overflow a 320 px en navegador real.
- **768 px:** hero en columnas; primer trabajo con foto y texto separados. Galería mantiene imágenes completas y controles cómodos. Contacto y footer se distribuyen según el espacio disponible.
- **1440 px:** anchura contenida de 1240 px, hero amplio y primer trabajo editorial; los siguientes trabajos utilizan dos columnas. Sin tarjetas administrativas ni estiramiento indiscriminado de la composición móvil.

Se inspeccionaron primero ambas referencias móviles y después la dirección de escritorio. Se usaron únicamente PNG oficiales y fotografías reales, sin copiar chrome de dispositivos ni semántica antes/después de los mockups.

## 5. Arquitectura pública

La home es un Server Component dinámico. `src/features/portfolio/data.ts` crea un cliente servidor anónimo sin cookies, persistencia de sesión ni caché, incluso si el visitante tiene una sesión privada. Una consulta al RPC alimenta hero y trabajos. Páginas de 12 trabajos y detección de página siguiente mediante un registro adicional; navegación documental sin prefetch/Router Cache para volver a consultar publicación.

`parsePublicJobs` conserva exclusivamente `id`, `name`, `job_date` y `media: { id, path }[]`. Las interacciones cliente se limitan a imagen/error/reintento y galería. Sin SDK Supabase ni Sharp en el bundle público cliente. No se crearon nuevas capas genéricas.

## 6. Imágenes y dimensiones

El pipeline privado aceptado permanece intacto: original privado sin modificación y WebP separado de hasta 1600 px, `fit: inside`, `withoutEnlargement`, sin EXIF. No se cambió arbitrariamente ese límite.

La entrega pública genera variantes WebP en memoria con anchos permitidos de 160/320/390/640/768/1024/1440/1600 px. Sin crop ni upscale del archivo; máximo 5 MiB y decodificación acotada. `next/image` usa loader propio, `sizes`, espacio reservado y carga lazy. Solo la foto del hero se precarga. El recorte `cover` se limita a previews/miniaturas; hero y ampliación usan `contain`.

Pruebas propias: vertical, horizontal, cuadrada, panorámica y vertical estrecha; el E2E comprueba tres fotografías reales/adaptaciones de QA con ratios distintos y compara dimensiones del derivado servido con las originales. Las adaptaciones JPEG/PNG se crean solo en memoria y nunca alteran `assets/demo/`.

## 7–8. Supabase, seguridad y privacidad

Se usa únicamente `iguana-garage`, proyecto de desarrollo dedicado autorizado. LiftTrack no se utiliza. No se modificaron migraciones, esquema, grants, políticas, buckets, configuración Auth ni clientes SSR privados.

El endpoint `/api/portfolio/photos/[jobId]/[mediaId]` reconstruye una ruta de derivado tras validar UUID, parámetros y ancho. Descarga exclusivamente `portfolio-derivatives` con identidad anónima y RLS en cada petición. Nunca acepta bucket/ruta/URL arbitraria, firma URLs ni recurre a originales ante errores.

Respuestas de imágenes, incluidos errores, con `private, no-store` y denegación genérica. `/_next/image` bloquea estas rutas: su caché podría conservar una copia después de retirar la publicación. La [documentación actual de Next Image](https://nextjs.org/docs/app/api-reference/components/image) confirma el comportamiento del loader, `sizes` y la ausencia de invalidación de esa caché.

Verificación real: un trabajo privado no aparece; el publicado aparece; HTML/RSC públicos no contienen `owner_id`, `paint_code`, código privado de QA, rutas originales ni tamaños internos. Originales y enumeración anónima denegados. Retirada: la misma URL de imagen antes autorizada pasa a 404 y una navegación nueva elimina el trabajo. No se promete recuperar copias ya descargadas.

## 9. Contacto / WhatsApp

Único dato externo pendiente de contacto: número real confirmado de Robin. `IGUANA_WHATSAPP_NUMBER` está vacío en `.env.example`; se configura en el entorno real en formato E.164 con `+` y sin espacios. Un helper central valida formato y construye ambos CTA/mensaje codificado.

Sin valor válido, la interfaz indica contacto próximo y no fabrica teléfono, `tel:` ni enlace WhatsApp. Se comprobó el estado sin teléfono y la construcción del enlace con número sintético de test. No se afirma haber contactado al número real ni haber validado su WhatsApp.

## 10. Accesibilidad y SEO

Title, description, Open Graph/Twitter básicos, idioma español, favicon oficial, landmarks, un H1 y jerarquía de títulos. Sin dominio/canonical/ubicación inventados ni herramientas SEO añadidas. Login, app y API de fotos tienen `X-Robots-Tag: noindex, nofollow`.

Axe WCAG A/AA sin infracciones en los recorridos públicos/privados. Targets visibles comprobados de al menos 44 px y sin overflow. Galería: Enter, foco inicial en cerrar, navegación con botones/flechas, Escape y retorno de foco al disparador. Alt contextual por nombre del trabajo/número de foto, sin inventar reparación ni resultado. No se afirma certificación WCAG ni prueba con lector de pantalla/hardware físico.

## 11. Performance

Sin fuentes remotas, nuevos paquetes ni estado global. SDK/queries/Sharp se quedan en servidor. Variantes responsive y galería ampliada cargada al abrir; reserva de geometría evita saltos. La ausencia de caché de fotos es una decisión de revocación, con coste de descarga/procesado por petición.

Mediciones locales Chrome, DPR 1, sin throttling, home con trabajos publicados:

| Vista | LCP observado | CLS | JS transferido (encodedBodySize) |
| --- | --- | --- | --- |
| 390 | 992 ms | 0 | 142.214 bytes |
| 768 | 356 ms | 0 | 142.214 bytes |
| 1440 | 1476 ms | 0 | 142.214 bytes |

Son mediciones de laboratorio, no datos de usuarios reales ni garantía del hosting futuro. ECC Chrome DevTools registró adicionalmente 491 ms/CLS 0 en home vacía a 390 px. No hay medición de campo/INP representativa.

## 12–14. Tests, E2E y QA visual

TDD observado de lógica propia: `npm test -- src/features/portfolio/contact.test.ts src/features/portfolio/delivery.test.ts`, 8 fallos de comportamiento/27 PASS → implementación → mismas 35 pruebas PASS. Se preservan contratos existentes y casos de denegación. No hay pruebas nuevas de internals de JWT, React o PostgreSQL.

| Verificación ejecutada | Resultado real |
| --- | --- |
| `npm run typecheck` | PASS, strict |
| `npm run lint` | PASS, 0 warnings |
| `npm run test:coverage` | PASS, 109 pruebas / 11 archivos |
| Cobertura de lógica comprobable | líneas 97,93%; statements 94,35%; ramas 93,06%; funciones 90% |
| `npm run test:supabase` | PASS, 9 pruebas reales / 2 archivos |
| `npm run test:e2e:config` | PASS, 6 recorridos en 2 archivos |
| `npm run test:e2e -- --project=mobile-390 ...` | PASS, área privada y portfolio |
| `npm run test:e2e -- --project=tablet-768 ...` | PASS, área privada y portfolio |
| `npm run test:e2e -- --project=desktop-1440 ...` | PASS, área privada y portfolio |
| E2E público de diagnóstico/capturas, 768/1440 | PASS, fotos decodificadas, viewport, interacción y limpieza |
| `npm run build` | PASS, producción |
| `npm ls --all` | exit 0, sin peers obligatorios inválidos; opcionales ausentes esperados |
| `npm audit --omit=dev` | exit 0, 0 vulnerabilidades de producción |
| `npm audit --json` | exit 1, 5 high en cadena de desarrollo existente; no resuelto/no PASS |
| `git diff --check` y whitespace de archivos nuevos | PASS |
| Secretos / entornos / índice | 0 secretos detectados; `.env` locales ignorados; índice vacío |
| SHA-256 de materiales protegidos | 31/31 intactos |
| Limpieza Supabase después de todos los tests | jobs=0, job_media=0, objetos=0 |

DAL y autorización no se maquillan mediante cobertura de mocks; se prueban mediante integración/E2E real. La prueba de JWT expirado permanece omitida por decisión del usuario, nunca contabilizada como PASS.

Los E2E cubren acceso, CRUD, publicación/retirada/republicación, galería, originales denegados, variantes y limpieza. También estados de cero trabajos, uno, varios, trabajo sin fotos y error de imagen con reintento. La integración mantiene aislamiento entre A/B, CRUD propietario, Storage y contrato público. Los fixtures están acotados a IDs temporales y se borran mediante la identidad propietaria.

### Evidencia visual fiable

- Evidencia pública actual tras los refinamientos aprobados: `.npm/portfolio-refinements-review/home-{390,768,1440}.png`, `hero-*.png`, `trabajos-*.png`, `cierre-*.png`, `contacto-footer-*.png` y `galeria-*.png`.
- Las capturas completas ensamblan capturas reales del viewport, sin modificar la página, para evitar el artefacto `fullPage` descrito abajo.
- Playwright limpió las capturas temporales anteriores de `test-results/` al ejecutar el E2E. Se repitieron las capturas públicas finales en la carpeta ignorada anterior, fuera de esa salida. Las capturas privadas históricas ya no se conservan; sus verificaciones ejecutadas constan en la tabla de este informe.

Capturas/informes están ignorados. Se interactuó con navegación y galería, no se hizo únicamente una colección de screenshots. Sin baseline automatizado de píxeles: regresión visual automática INCONCLUSIVE; revisión manual actual frente a referencias y comprobaciones geométricas ejecutadas.

## 15. Problemas encontrados y resueltos

1. Nombre accesible distinto de «Ver fotos»: corregido y mismo E2E/axe GREEN.
2. Modal abría antes de montar su control de cierre: control disponible antes de `showModal`; foco inicial y retorno verificados.
3. Fixtures mezclaban rutas y buffers en `setInputFiles`: corregido en QA, sin modificar producto.
4. Un único aborto podía recuperarse durante hidratación: fallo HTTP controlado persistente para comprobar nuestro estado de error/reintento, sin revalidar el navegador.
5. Capturas `fullPage` negras en tablet/escritorio: diagnóstico con `decode()`, geometría, visibilidad y captura de viewport consecutiva. El viewport muestra correctamente las mismas fotos que la captura completa deja negras. Se confirma artefacto de captura de este entorno; no se aplicó un parche de UI a una página que renderiza correctamente. El modal se captura a tamaño de viewport.

La interrupción de herramientas por límite de revisión automática no fue una determinación de acción insegura. Se retomó el trabajo desde los informes guardados y se completó el diagnóstico mediante Playwright autorizado, sin reiniciar implementación ni el QA ya aceptado.

## 16–17. Deuda y datos externos

- Permanece ESLint 9.39.5 por los peers bloqueantes documentados; no se fuerza ESLint 10.
- Auditoría actual: cinco avisos high en `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next` y `eslint-config-next`, todos de la cadena de desarrollo existente. Ningún paquete/lockfile cambió en este bloque; producción auditada sin vulnerabilidades.
- Se conserva la decisión operativa de protección de contraseñas filtradas de Supabase descrita en el gate anterior. Cuenta definitiva/entorno de producción y despliegue se acuerdan después; no se alteraron aquí.
- Falta teléfono confirmado y contenido real publicado por Robin. No se fabrican fechas, trabajos ni datos de contacto de producción.
- Safari/iOS, hardware y lector de pantalla no probados; performance de campo y baseline visual no disponibles. El artefacto `fullPage` es una limitación de QA documentada, no un defecto conocido de la página.

## 18–20. Archivos y Git

Modificados: `.env.example`, `README.md`, `next.config.ts`, `vitest.config.ts`, `src/app/page.tsx`, `supabase/README.md`.

Nuevos: este informe, `e2e/public-portfolio.spec.ts`, `src/app/loading.tsx`, `src/app/portfolio.css`, `src/app/api/portfolio/photos/[jobId]/[mediaId]/route.ts`, y `src/features/portfolio/{contact,contact.test,delivery,delivery.test,data,image-processing}.ts` más `{contact-link,gallery,photo}.tsx`. Total: 20 archivos, 6 modificados y 14 nuevos.

`main` conserva HEAD `76967ca3cd4d835c36f2cddd2c04c6aa85393bc6`, con esos cambios sin staging. Sin commit, remote nuevo ni push. No se versionó ningún secreto. `.env.local` y `.env.integration.local` siguen ignorados. AGENTS/PRODUCT/DESIGN, assets/referencias, arquitectura privada, dependencias y migraciones permanecen intactos.

ECC aplicado: ecc-guide, aceptación según instrucciones locales, frontend-design-direction/frontend-patterns, react-performance, accessibility, tdd-workflow, security-review, browser-qa y verification-loop. Skill Supabase para la integración existente; Chrome DevTools para medición/inspección pública. Sin agentes, instalación global ni workflows con gates intermedios.

## Refinamientos después de la revisión humana positiva

Solo se ajustan selección visual y cierre de composición. `portfolioHero` elige el último trabajo con fotografías de la página que sea distinto del primer trabajo del listado. Se conservan todos los trabajos, fotografías, orden y paginación. Si no existe una alternativa, se usa el estado de identidad oficial existente; no se duplica el único trabajo ni se oculta su galería.

A partir de 1200 px, si tras el primer trabajo editorial queda un último trabajo sin pareja, ese último ocupa una fila completa: texto a la izquierda y fotografía a la derecha. El título conserva su escala. `sizes` se ajusta al ancho de esa foto; en móvil y tablet mantiene los tamaños anteriores. Sin cambios de tipografía, color, marca, arquitectura, acceso, contacto ni comportamiento de galería.

TDD observado:

- `npm test -- src/features/portfolio/delivery.test.ts`: 8 nuevos fallos por selección ausente y 26 PASS → implementación → las mismas 34 pruebas PASS. Incluye lista vacía, un único trabajo, alternativas sin fotos y conservación del listado.
- `node .npm/portfolio-refinements.mjs layout 1440`: RED real, hero y primer trabajo usan la misma foto y último trabajo de 596 px en una cuadrícula de 1240 px → GREEN real, fotos de trabajos distintos y último trabajo de 1240 px.

Verificación ejecutada en este refinamiento: build, typecheck strict y lint sin errores; cobertura con 117 pruebas en 11 archivos, líneas 97,94%, statements 94,41%, ramas 93,13% y funciones 90,38%. `npm run test:e2e -- e2e/public-portfolio.spec.ts`: 3/3 PASS, en 390, 768 y 1440 px; config descubre los 6 recorridos existentes. El recorrido privado y la integración Supabase del bloque anterior no se repiten, porque su código, modelo y políticas no cambian.

QA visual real en orden 390 → 768 → 1440 con cuatro grupos demo documentados y diez fotografías, incluyendo una galería de una sola foto. Los originales son verticales; dos encuadres horizontales de QA se crean solo en memoria. Las fechas son técnicas de fixture, no fechas reales de reparaciones. Se verifican también composiciones de 2, 3 y 4 trabajos en el DOM de QA, restaurándolo inmediatamente: columna única y proporción 4:5 en móvil, tablet intacta y cierre editorial únicamente en escritorio. Galerías, controles, foco, navegación, contacto/footer, decodificación de fotos, ausencia de overflow, consola/red y axe comprobados. Las capturas finales recuperadas están fuera de la salida que limpia Playwright.

No se crean checkpoints de TDD por instrucción expresa del usuario: sin staging, commit ni push. Materiales protegidos, dependencias, código privado y resto del proyecto conservados. Los fixtures y sus archivos se retiran después de las evidencias; la limpieza se confirma mediante consulta de recuentos y home vacía antes de entregar.
