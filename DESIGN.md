# Iguana Garage — decisiones visuales

## Identidad

Identidad oficial inmutable; interfaz **siempre oscura**, sin azul ni tema claro. [PRODUCT.md](PRODUCT.md) delimita funciones y [AGENTS.md](AGENTS.md) la operación.

| Color oficial | Valor |
| --- | --- |
| Iguana Green | `#7A9A3A` |
| Carbon | `#0E1110` |
| Bone | `#F8F4DA` |
| Metal | `#2A2D2B` |

Estos cuatro colores son la base de la marca. El portfolio público puede derivar matices de ellos (opacidades, tonos más claros u oscuros del mismo color) si el diseño lo necesita, sin introducir azul ni colores ajenos a la marca. PWA usa Carbon. El privado conserva tonos operativos aprobados de `globals.css`, incluidas superficies oscuras y un verde de acción más claro (`#C0E878`).

## Marca

Solo identidad de `assets/brand/`: logo horizontal, wordmark y símbolo oficiales. No redibujar, reinterpretar, recolorear, regenerar, deformar ni modificar la iguana o la tipografía oficial del logo. Escalar proporcionalmente sin recortar el arte.

`src/app/icon.png`, `src/app/favicon.ico` y los iconos `public/pwa/` son derivados/copias técnicos separados. Los generadores `scripts/prepare-favicon.mjs` y `scripts/prepare-pwa-icons.mjs` reutilizan el símbolo; no crean marca ni se ejecutan en requests.

Los 14 demos se eliminaron intencionadamente: `assets/demo/` ya no existe; no reconstruirlos. No hay maquetas de referencia: no existe un diseño objetivo que imitar.

## Portfolio público (`/`): abierto a rediseño completo

La home pública está en **rediseño completo**. Las versiones anteriores (capturas en `.npm/`) se consideran descartadas: sirven para saber qué no repetir, no como punto de partida. No conservar por inercia su estructura, su orden de secciones, su hero de copy, su grid ni su tono editorial.

### Fijo

- **Marca:** assets oficiales y colores anteriores; siempre oscuro.
- **Fotografía real:** solo las fotos publicadas del contrato público. Son fotos de móvil hechas en el taller, a menudo de piezas en preparación o aparejo, con proporciones y calidad variadas. El diseño debe hacer que **este material** luzca y parezca intencionado; no presuponer fotografía de estudio ni diseñar para fotos que no existen. Nada de stock, IA ni imágenes de relleno.
- **Datos y copy:** solo existen nombre, fecha, descripción opcional y fotos (con punto focal) por trabajo. No inventar categorías, códigos de color, teléfonos, redes sociales, presupuestos, servicios, promesas ni datos comerciales.
- **Funcionalidad pública** descrita en [PRODUCT.md](PRODUCT.md): trabajos publicados paginados, transformación Antes/Después opcional, visor completo, CTA de WhatsApp con estado pendiente, estados de carga/vacío/error, sin login visible ni PWA.

### Libre

Estructura y orden de secciones, layout y retícula, escala y jerarquía, tratamiento de las fotos (recortes, marcos, mosaicos, a sangre, secuencias), ritmo de scroll, microinteracciones y animación (respetando `prefers-reduced-motion`), copy breve dentro de los límites anteriores y **tipografía**: la home pública puede usar una o dos fuentes web autoalojadas con `next/font` que dialoguen con el logo. Arial/Helvetica deja de ser obligatoria en la parte pública.

### Reglas técnicas del visor y las imágenes

- Las vistas previas pueden recortar con `cover` y punto focal; al ampliar se muestra la imagen completa con `contain`, sin deformar.
- El visor (dialog nativo) va centrado respecto al viewport con `fixed/inset/margin:auto`, independiente del layout de la home, con contador, miniaturas, anterior/siguiente, cierre, Escape/flechas y retorno de foco.
- Reservar espacio de imágenes y ajustar `sizes` al ancho realmente pintado.

Cuando el rediseño esté aprobado, sustituir esta sección por la descripción del diseño elegido.

## Gestión privada

Compacta, funcional y mobile-first, priorizando operación cotidiana desde teléfono. Tipografía de interfaz Arial/Helvetica/sans-serif. Formularios con etiquetas visibles, errores útiles, progreso y reintento; los datos confirmados no deben perderse ni comunicar un guardado incompleto como éxito.

No introducir rediseños decorativos que reduzcan legibilidad, espacio de fotos, acceso a botones o rapidez de uso. Verde para acciones principales; borrados identificados con texto y confirmación, sin depender solo del color. El login comparte la identidad privada sin mostrar el marco de gestión antes de autenticar. El rediseño público no se aplica al privado.

El visor privado mantiene centrado robusto de dialog respecto al viewport (`fixed`, `inset:0`, `margin:auto`), fotografías `contain`, proporción real y controles accesibles. No acoplar cambios de su presentación al visor público sin comprobar ambos.

## Responsive y accesibilidad

Diseñar y verificar en este orden: **390 px principal → 768 px adaptación → 1440 px adaptación**. Los breakpoints reales del CSS responden al contenido. No diseñar desktop primero ni compactar más móvil para imitarlo.

Conservar objetivos táctiles de al menos 44 × 44 px, contraste, foco visible, etiquetas y nombres accesibles; Escape, flechas y retorno de foco del dialog nativo. Respetar reducción de movimiento y comprobar teclado abierto, zoom, overflow, orientación y estados de carga/vacío/error.

Verificar con fotografía vertical y horizontal real autorizada, sin cambios de producción para montar capturas. La emulación no sustituye una prueba física en Android/iPhone; no declarar esa QA sin ejecutarla.
