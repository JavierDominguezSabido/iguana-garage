# Pipeline de fotografías — ajuste aislado de overserving

7 de octubre de 2026. Arquitectura y ajuste aprobados. Las mediciones siguientes corresponden al laboratorio local sobre HEAD base `22a6cefafc720cbcac2f804494ec9e5e2bd085ed`; no equivalen a resultados de Render. La migración de producción ya está aplicada; el checkpoint prepara la publicación del código y el backfill posterior al deployment Live.

## Migración de producción

Autorización explícita limitada a `private.owns_derivative` y `private.is_public_derivative` en `atibisongftmspwtyndv`. Aplicación correcta del archivo `20261007090238_responsive_private_derivatives.sql`; el conector registró la versión remota `20261007112616`, nombre `responsive_private_derivatives`. Conservar esta correspondencia al reconciliar historial con CLI; no ejecutar `db push` sin revisarla.

Verificación inmediata de solo lectura: cuerpos de ambas funciones coinciden con el SQL local, permisos y policies intactos, ambos buckets privados y RLS activa. Se conservan huellas de filas y objetos: **4 jobs / 13 job_media / 13 originales / 13 masters / 0 sidecars**. Descarga HTTP legacy anónima correcta. Roles PostgreSQL reales verifican originales y enumeración denegados a anon, cinco paths permitidos para medios publicados, paths manipulados y relaciones ajenas denegados, y aislamiento del propietario. No se modificaron Auth, filas ni objetos. Los cuatro trabajos existentes están publicados: la retirada y jobs privados se probaron en PostgreSQL aislado, sin cambiar publicaciones reales.

## Decisión basada en medidas

Escalera final: **320 / 390 / 640 / 768 / master 1600**. La familia anterior 320/640/1024 aumentaba bytes móviles; queda sustituida antes de aplicar su migración. Los criterios de bytes de la home se cumplen en las dos muestras finales de cada escenario.

| Escenario | Transformación: CSS → solicitado | Cards: CSS → solicitado | Visor vertical: marco / ancho pintado → solicitado |
|---|---|---|---|
| 390 DPR1 | 169 → 320 | 350 → 390 | 340 / 340 → 390 |
| 390 DPR2 | 169 → 390 | 350 → 768 | 340 / 340 → 768 |
| 768 DPR1 | 340 → 390 | 340 → 390 | 718 / ≈461 → 640 |
| 1440 DPR1 | 606 → 640 | 606 → 640 | 1110 / ≈450 → 640 |

Miniaturas: 60 CSS px; solicitan 320, o reutilizan una imagen mayor cargada. 320 también se utiliza por la transformación móvil y ahorra 13.180 B frente a entregar 390 en sus dos fotos.

Candidatos calculados con los mismos archivos reales medidos. Bytes iniciales en orden 390/1, 390/2, 768/1, 1440/1:

- Familia final: 140.482 / 338.368 / 153.662 / 326.012.
- Sin 320: 153.662 / 338.368 / 153.662 / 326.012; más resolución para transformación/miniaturas.
- Sin 390: 258.074 / 393.126 / 326.012 / 326.012; vuelve el overserving móvil/tablet.
- Sin 640: 140.482 / 338.368 / 153.662 / 422.622; incumple escritorio.
- Sin 768: 140.482 / 729.390 / 153.662 / 326.012; incumple móvil DPR2.
- Añadir 1024 no cambia ninguna solicitud del portfolio real en los cuatro escenarios: no se conserva sin necesidad medida. Horizontales mayores/proporciones desconocidas tienen master disponible; una escalera finita no garantiza selección óptima para todos los futuros encuadres.

Estos costes de quitar tamaños son cálculo sobre archivos medidos, no nuevas muestras de navegador. La familia final sí se midió en Chrome real.

## Paths y autorización

| Variante | Path privado en portfolio-derivatives | WebP |
|---|---|---:|
| 320 | `jobId/mediaId/320.webp` | 78 |
| 390 | `jobId/mediaId/390.webp` | 78 |
| 640 | `jobId/mediaId/640.webp` | 78 |
| 768 | `jobId/mediaId/768.webp` | 78 |
| 1600 / legacy | `jobId/mediaId.webp` | 82; masters existentes intactos |

Original inmutable en `job-originals/ownerId/jobId/mediaId.ext`. La migración local `20261007090238_responsive_private_derivatives.sql` sustituye únicamente `private.owns_derivative` y `private.is_public_derivative`: IN con esos cinco strings exactos, desde join `media.job_id = job.id`. Propietario: `job.owner_id = auth.uid()`. Público: `job.is_public`. Search path vacío, referencias cualificadas y ownership/grants conservados. Sin cambios en buckets privados, policies, roles, RPC, tablas o public_jobs_projection.

DENY para paths 321/1024/9999, extensiones/nombres manipulados, UUID no relacionado, job/propietario ajeno. También objetos inválidos existentes sembrados solo en PostgreSQL efímero: RLS los oculta. Publicar/retirar habilita/deniega las cinco rutas sin enumeración/firma/escritura pública. Anon no accede a job privado ni objeto inexistente.

URLs históricas `w=160/1024/1440` siguen como entradas de compatibilidad: no autorizan esos sidecars en Storage. Se elige ruta preparada o fallback legacy. Nuevas imágenes solicitan únicamente la escalera final.

## Arquitectura y fallos

Procesamiento durante subida, secuencial para limitar memoria: JPEG/PNG/WebP, 40 MP, máximo 10 MiB de entrada y 5 MiB por derivado, sin animación, orientación EXIF y metadata retirada, proporción/no-upscale. Original sin modificaciones. Cinco derivados; master al final como señal compatible con la proyección.

Upload original → metadata que permite RLS → cuatro sidecars → master. Subida directa exige job privado; el formulario ya usa prepareJob. Fallo parcial limpia solo objetos nuevos, incluyendo ACK perdido. Cleanup fallido conserva original/metadata con error recuperable. Reintento compara bytes, sin duplicar ni sustituir. Fallo de INSERT/ACK comprueba fila persistida antes de eliminar original. finishJob recupera desde original privado; no backfill implícito de masters completos.

Delete photo/job elimina cuatro sidecars/master, original y después metadata; conserva metadata si falla para reintentar. Mantenimiento owner/RLS inspecciona whitelist compartida, solo prepara faltantes, sin sobrescribir master/original.

Entrega normal: cliente anónimo independiente de cookies, validación UUID/whitelist, descarga preparada con RLS en cada petición, comprobación ligera WebP/tamaño y bytes exactos; **cero llamadas Sharp**. Si falta una variante, nueva comprobación RLS del master y resize legacy. Nunca original/service_role/signed URL. Storage caído sigue siendo error.

Éxitos/errores conservan private, no-store, max-age=0 y CDN no-store. Bloqueo de estas rutas en /_next/image intacto. Retirada deniega nuevas descargas; no recupera copias ya descargadas. Antes de preparar fotos legacy el fallback puede añadir un intento fallido de Storage; no se promete reducción medida a fotos sin sidecars.

## Sizes, carga y calidad

Transformación/cards ya declaraban correctamente su ancho CSS; sin cambios de diseño/estilos/composición. Sizes del visor limita el slot a min(ancho del marco, altura * proporción). Toma la proporción de una imagen del mismo job/media decodificada en la página: sin metadata privada/contrato nuevo/otro recurso. Sin proporción conocida usa marco real conservador. Navegación recalcula desde fotos/miniaturas cargadas. Miniaturas declaran 60 px, descontando bordes.

QA horizontal usa temporalmente una copia pública rotada en el transporte del navegador, sin alterar assets/Supabase: visor 390/1→390, 390/2→768, 768/1→768, 1440/1→master1600. Foto completa, centrada, contain, sin overflow. Proporción desconocida verificada en cuatro escenarios: 390/768/768/1600. Ese transporte no prueba RLS: permisos probados separadamente en PostgreSQL.

Se observaron duplicados con eager + preload SSR automático y respuestas rápidas no-store: ocho imágenes en móvil DPR2 y siete/ocho en escritorio. Lazy nativo con fetchPriority=high para críticas visibles y normal para el resto suprime hints duplicados sin cachear. Ocho cargas adicionales (cuatro por 390 DPR2/1440) dieron seis solicitudes y cero duplicadas. No se ocultan muestras iniciales fallidas ni se proclama mejora uniforme de LCP.

Calidades 76/78/80 comparadas sobre los 13 masters públicos a 320/390/640/768/1024. A 768 suman 860.054 / 933.820 / 1.008.946 B. A 78 frente a 80, diferencia media RGB 1,80/255 a 768; no garantiza percepción. Inspección de pintura blanca, negra/reflejos y llantas a tamaño de visualización: sin degradación relevante apreciada a 78. No se baja a 76 por pocos KB. Master82 intacto.

## Mediciones finales

HEAD anterior y nuevo compilados con Next production start en localhost, mismo PostgreSQL/transporte aislado y copias de los 13 masters públicos. Dos contextos Chrome nuevos por escenario, sin throttling. Sin originales privados descargados ni writes remotos. Laboratorio, no después de Render. Un futuro backfill desde originales puede generar pesos diferentes.

KB decimal, cuerpos de las seis imágenes iniciales:

| Escenario | Navegador antes → después | Storage antes → después | LCP antes → después (dos muestras, ms) |
|---|---:|---:|---|
| 390 DPR1 | 151,450 → 140,482 | 976,888 → 140,482 | 264/80 → 556/400 |
| 390 DPR2 | 366,244 → 338,368 | 976,888 → 338,368 | 380/368 → 392/124 |
| 768 DPR1 | 165,814 → 153,662 | 976,888 → 153,662 | 380/88 → 488/392 |
| 1440 DPR1 | 351,502 → 326,012 | 976,888 → 326,012 | 380/124 → 384/112 |

Navegador −7,2–7,6%; Storage −65,4–85,6%. 18 recursos más HTML, sin duplicaciones finales. Cuerpos totales iniciales: 1.092.765→1.081.728 B, 1.307.559→1.279.614 B, 1.107.129→1.094.908 B, 1.292.817→1.267.258 B. Otros recursos ~941 KB, fuera del ajuste.

CLS **0**, overflow **0**, pageerror/console-error/HTTP>=400 **0**. Geometría hero/transformación/trabajos idéntica. LCP variable, sin mejora uniforme; móvil DPR1 y tablet más lentos en estas dos muestras. Bytes menores no garantizan LCP mejor.

Foto completa Mercedes Clase E: 24.252→21.978 B (390/1), 66.396→60.912 B (390/2), 66.396→46.632 B (768), 125.510→46.632 B (1440). Bytes adicionales al abrir visor, incluidas miniaturas: 18.402→52.468 B móvil, 84.798→99.100 B tablet, 143.912→52.468 B escritorio. No se afirma reducción de toda transferencia: mínimo320 pesa más que miniaturas legacy160. Home cumple baselines; la escalera acotada tiene ese coste al abrir galería.

Microbenchmark: ocho iteraciones × cuatro fotos × cuatro tamaños. Resize legacy **81,54 ms** medios de pared frente a **0,31 ms** de transmisión preparada en memoria, excluye IO/HTTP/RLS. CPU legacy **90,34 ms** medios; preparada bajo resolución del contador de Windows, no CPU total cero. Pruebas handler verifican cero llamadas Sharp normales.

## TDD y verificación

- Escalera/generación/selección: RED observado 6 fallos/14; GREEN 16/16 incluyendo visor.
- Policies: RED rechaza390/768 y permite indebidamente1024; GREEN21/21. Fixture tolera siembra repetida para no ocultar DENY público por un fallo anterior.
- Sizes contain: dos RED por función ausente; GREEN vertical/horizontal/fallback inválido/desconocido.
- Carga crítica: RED por hint SSR que debía estar ausente; misma prueba GREEN. Duplicaciones observadas/corregidas en Chrome real.
- npm run test:isolated: **30/30 PASS**, policies21 + pipeline9: RLS, publicar/retirar, recovery/ACK perdido/rollback/cleanup fallido/retry/otro propietario/delete sin huérfanos/mantenimiento dry-run.
- npm run test:coverage: **148/148 PASS**, 95,97% statements, 95,34% branches, 92,75% functions, 98,5% lines. DAL aislado: 87,42% statements, 81,35% branches, 100% functions, 98,23% lines; 30/30 PASS con carpeta propia .npm/image-pipeline/dal-coverage. El primer intento simultáneo de ambas coberturas fue rechazado por carpeta compartida antes de ejecutar tests; corregido separando informes.
- Playwright afectados: **9/9 PASS** en390/768/1440, acceso/fotos completas/navegación/teclado/Escape/cerrar/foco/no overflow. QA adicional:12 casos vertical/horizontal/proporción desconocida.
- npm run typecheck, npm run lint, npm run build y git diff --check: **PASS** al cierre. Secret scan: 132 archivos versionables, 116 textos, cero coincidencias y cero staged. .env.local/.env.integration.local/.env.maintenance.local ignorados. Previews/backend aislados detenidos; build normal restaurado.

PGlite0.5.8 solo dev: PostgreSQL/RLS real, roles no privilegiados y migraciones del proyecto. Sustrato mínimo auth/storage y transporteHTTP son fixtures locales: **no validan GoTrue/JWT ni backend Storage alojado completo**. La autorización explícita de producción permitió aplicar la migración y verificar roles/descarga HTTP reales de solo lectura. No suites mutantes existentes contra producción.

Npm audit del bloque previo: cinco high preexistentes en cadena ESLint/fast-glob/micromatch/braces, no PGlite. Sin downgrade/force fix ni audit limpio declarado.

## Fotos existentes, archivos y Git

SELECT de producción antes y después de la migración:4 jobs/13 medios/13 originales/13 masters/cero sidecars/autorizaciónlegacy. Las huellas de datos y objetos coinciden. No se ha ejecutado todavía el backfill en este checkpoint.

Secuencia restante autorizada: verificaciones del código → commit único/push normal → deployment automático Live → smoke sin alterar datos → dry-run owner/RLS y referencia confirmada → apply con guard de referencia → inventario esperado **52 sidecars** y comprobación de integridad. Si faltan credenciales locales de mantenimiento, detenerse antes del backfill e indicar únicamente los nombres de variables. Conservar13masters/originales/posiciones/publicación, nunca backfill implícito ni service_role. No probar borrado ni retirada cambiando datos reales.

scripts/prepare-photo-variants.mjs requiere condiciones react-server/expected-project-ref; .env.maintenance.local ignorado, plantilla vacía. No se autenticó ni ejecutó siquiera dry-run contra producción.

Bloque acumulado:16 modificados +14 nuevos =30 antes del checkpoint. Modificados: next.config, package/lock, tsconfig, ruta pública photos, jobs/data/image-processing/pruebas, portfolio/delivery/image-loader/pruebas/image-processing/photo/pruebas/viewer, supabase/README. Nuevos: plantilla mantenimiento/herramienta/informe, portfolio/variants/response/pruebas/viewer.test, migración aplicada, config aislada/cuatro archivos integración. AGENTS/PRODUCT/DESIGN/assets/references sin diff.

Evidencia ignorada .npm/image-pipeline: width-audit-before/after, ladder-quality, ladder-candidates, ladder-comparison/report/summary/PNG, ladder-lightbox, critical-requests, cpu.json. Ensayo anterior conservado separado. Previews/fixtures efímeros se detienen al cierre.

ECC proporcional: ecc-guide/TDD/browser-qa/verification-loop durante el ajuste; deployment-patterns/database-migrations para la publicación autorizada. Sin agentes/configuración global.
