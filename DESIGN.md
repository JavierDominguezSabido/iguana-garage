# Iguana Garage — decisiones visuales

## Identidad y dirección

Identidad oficial inmutable; interfaz **siempre oscura**, sin azul ni tema claro. [PRODUCT.md](PRODUCT.md) delimita funciones y [AGENTS.md](AGENTS.md) la operación.

| Color oficial | Valor |
| --- | --- |
| Iguana Green | `#7A9A3A` |
| Carbon | `#0E1110` |
| Bone | `#F8F4DA` |
| Metal | `#2A2D2B` |

El portfolio aplica estos tokens en `src/app/portfolio.css`; PWA usa Carbon. El privado conserva tonos operativos aprobados de `globals.css`, incluidas superficies oscuras y un verde de acción más claro (`#C0E878`): no afirmar que todos sus tokens son idénticos a los públicos ni recolorearlo como corrección documental. Tipografía de interfaz: Arial/Helvetica/sans-serif; la tipografía oficial de marca se conserva en sus assets gráficos.

## Marca y materiales

Solo identidad de `assets/brand/`: logo horizontal, wordmark y símbolo oficiales. No redibujar, reinterpretar, recolorear, regenerar, deformar ni modificar la iguana o la tipografía oficial; tampoco extraer marca de mockups. Escalar proporcionalmente sin recortar el arte.

`src/app/icon.png`, `src/app/favicon.ico` y los iconos `public/pwa/` son derivados/copias técnicos separados. Los generadores `scripts/prepare-favicon.mjs` y `scripts/prepare-pwa-icons.mjs` reutilizan el símbolo; no crean marca ni se ejecutan en requests.

Preservar `assets/brand/` y `references/`. Las referencias desktop/mobile orientan lenguaje y coherencia, no imponen nuevos campos ni funciones y no son una maqueta obligatoria de la home actual. Marcos de teléfono/barras de sistema no son UI. Los 14 demos se eliminaron intencionadamente: `assets/demo/` ya no existe; no reconstruirlos ni conservar su inventario antiguo como material disponible.

## Portfolio público actual

Dirección de **reportaje de carrocería / ficha de taller**: fotografía protagonista, composición editorial, menos bordes y asimetría controlada. Evitar decoración que compita con reparaciones reales.

Secuencia: header simple → hero de copy y CTA → transformación curada si está disponible → trabajos/galería → contacto → footer. El hero actual no es una fotografía panorámica. Copy corto y concreto; no añadir descripciones, promesas ni datos comerciales inventados.

- Móvil: trabajos en **una columna**, fotografías grandes y CTA claros; navegación simple hacia la galería. La transformación es una pareja Antes/Después de dos imágenes, también en móvil.
- Tablet/escritorio: composición adaptada, columnas y espacios proporcionados; el último trabajo sin pareja recibe un remate centrado, sin gran vacío lateral.
- Fotografías con relaciones de aspecto diversas. Las vistas previas pueden usar `cover` para componer; al ampliar se conserva la imagen completa con `contain`, sin deformarla.
- Comparación curada del mismo trabajo: preparación y acabado de pintura; no inferir un vehículo completamente montado ni un Antes/Después por orden de archivos.
- Galería/visor con contador, miniaturas, anterior/siguiente, cierre y teclado. El dialog público está centrado respecto al viewport, con `fixed/inset/margin:auto`; no depende del contenedor de la home.

El portfolio puede evolucionar o rediseñarse con aprobación posterior. La identidad oficial, la publicación explícita, el contrato público limitado y la separación de la PWA privada se mantienen.

## Gestión privada

Compacta, funcional y mobile-first, priorizando operación cotidiana desde teléfono. Formularios con etiquetas visibles, errores útiles, progreso y reintento; los datos confirmados no deben perderse ni comunicar un guardado incompleto como éxito.

No introducir rediseños decorativos que reduzcan legibilidad, espacio de fotos, acceso a botones o rapidez de uso. Verde para acciones principales; borrados identificados con texto y confirmación, sin depender solo del color. El login comparte la identidad privada sin mostrar el marco de gestión antes de autenticar.

El visor privado mantiene centrado robusto de dialog respecto al viewport (`fixed`, `inset:0`, `margin:auto`), fotografías `contain`, proporción real y controles accesibles. No acoplar cambios de su presentación al visor público sin comprobar ambos.

## Responsive y accesibilidad

Diseñar y verificar en este orden: **390 px principal → 768 px adaptación → 1440 px adaptación**. Los breakpoints reales del CSS responden al contenido; no equivalen necesariamente a esos tres anchos de QA. No diseñar desktop primero ni compactar más móvil para imitarlo.

Conservar objetivos táctiles de al menos 44 × 44 px, contraste, foco visible, etiquetas y nombres accesibles; Escape, flechas y retorno de foco del dialog nativo. Respetar reducción de movimiento y comprobar teclado abierto, zoom, overflow, orientación y estados de carga/vacío/error.

Reservar espacio de imágenes y ajustar `sizes` a su ancho pintado; no confundir marco CSS con ancho real de una foto `contain`. Verificar fotografía vertical/horizontal real autorizada, sin stock/IA ni cambios de producción para montar capturas. La emulación no sustituye una prueba física en Android/iPhone; no declarar esa QA sin ejecutarla.
