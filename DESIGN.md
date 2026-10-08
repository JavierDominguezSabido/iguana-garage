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

## Portfolio público (`/`): diseño final

Muro de trabajos de taller con una portada centrada en el comparador Antes/Después. Siempre oscuro, titulares condensados y fotos verticales de móvil como material principal. Implementación en `src/app/page.tsx`, `src/app/portfolio.css` y `src/features/portfolio/`.

### Límites que siguen vigentes

- **Marca:** assets oficiales y los cuatro colores base; sin azul ni tema claro.
- **Fotografía real:** solo las fotos publicadas del contrato público. Son fotos de móvil hechas en el taller (casi todas verticales, calidad y encuadre variables). Nada de stock, IA ni imágenes de relleno.
- **Datos y copy:** solo existen nombre, fecha, descripción opcional y fotos (con punto focal) por trabajo. No inventar categorías, códigos, teléfonos, redes, presupuestos, servicios ni promesas. Ningún dato ni nombre va fijo en el código: se corrigen desde `/app`.
- **Funcionalidad pública** de [PRODUCT.md](PRODUCT.md): trabajos paginados, transformación Antes/Después opcional, visor, CTA de WhatsApp con estado pendiente, estados de carga/vacío/error, sin login visible ni PWA.

### Tipografía

**Barlow Condensed** (600/700/800) para titulares y **Barlow** (400/500/600) para texto y etiquetas, autoalojadas con `next/font` en `page.tsx` (variables `--font-pub-display` y `--font-pub-text`, con Arial como respaldo). Titulares en mayúsculas con interlineado ≈ .84–1; etiquetas pequeñas en mayúsculas con tracking .12em. Contrasta con la geometría ancha del logo en lugar de imitarla. Solo la home pública: la gestión privada sigue en Arial/Helvetica.

### Estructura y orden

1. **Cabecera:** logo oficial + botón compacto «WhatsApp» (o «Contacto», que lleva a la sección de contacto, si no hay número válido).
2. **Portada:** título «Chapa y pintura.» muy grande (punto en verde), la frase «Arrastra para ver el antes y el después» y el comparador.
   - Móvil (390): título, frase, comparador (con el nombre del trabajo como etiqueta encima) y botón «Ver fotos» caben en la primera pantalla; el CTA de WhatsApp queda justo debajo.
   - Desde 700 px: título, frase y CTA a la izquierda, centrados verticalmente; comparador a la derecha, en torno al 46 % del ancho y casi toda la altura útil (`100svh − 250px`, proporción 4:5). La portada ocupa la pantalla entera solo en apaisado; en vertical (tablet) se ajusta a su contenido.
   - Sin transformación disponible: el título va solo, sin foto ni frase, con su CTA.
   - **Símbolo oficial** de fondo: entero, sin girar, sin recolorear y sin recortar, a ~8 % de opacidad, detrás del título (arriba a la derecha en móvil; abajo a la izquierda en escritorio; arriba a la derecha en la portada sin foto). Es decorativo (`alt=""`) y se sirve redimensionado por el optimizador de `next/image`, permitido solo para `/_next/static/media/**`.
3. **«Trabajos realizados»:** titular y una banda por trabajo (ver Muro).
4. **Contacto** («¿Hablamos de tu coche?» + CTA) y pie con logo.

Contenedor máximo de 1760 px, centrado; márgenes laterales de 20 px (móvil), 28 px (≥700) y 40 px (≥1100).

### Comparador Antes/Después

- Una sola imagen con barra deslizante: la foto «Después» completa y la «Antes» recortada por `clip-path`; chips «Antes» y «Después» en las esquinas. Ambas con `cover` y su punto focal.
- Es un `role="slider"` con nombre «Comparador Antes y Después: {trabajo}», `aria-valuenow/min/max` y `aria-valuetext` («Antes 58 %, Después 42 %»). Teclado: flechas ±4 (Mayús ±10), Re Pág/Av Pág ±10, Inicio y Fin.
- **Solo se arrastra, no se toca para abrir.** Debajo, un botón visible «Ver fotos» abre el visor del trabajo. No hay umbral arrastre/toque.
- `touch-action: pan-y`: el scroll vertical de la página funciona siempre, también empezando sobre la foto; solo se captura el gesto horizontal. En táctil el arrastre es relativo (sin saltos); con ratón la barra sigue al puntero.
- La barra se mantiene entre el 14 % y el 86 % del ancho para no chocar con el gesto de «atrás». Tirador de 52 px, verde con anillo, siempre visible.
- Pista de uso: al entrar en pantalla la barra se desplaza sola ≈12 puntos y vuelve, una sola vez; se cancela si la persona interactúa. Sin pista con `prefers-reduced-motion`.
- Las fotos Antes/Después no tienen por qué estar alineadas (distinto ángulo de cámara): es inherente al material y no se recorta ni corrige.

### Muro de trabajos

- Cada trabajo es un `article` con una **banda** (borde superior verde de 3 px, nombre en mayúsculas, fecha larga y «N fotografías», y la descripción si existe) y todas sus fotos a la vista. Una foto abre el visor en esa misma imagen.
- Fotos en recuadros 4:5 con `cover` y punto focal, separados 2 px, con contador `n/N`. Móvil/tablet (<900): dos columnas y, si el número de fotos es impar, la primera a todo el ancho. Desde 900: 12 columnas con filas de hasta cuatro fotos (4 por fila → 3 columnas cada una, 3 → 4, 2 → 6; una sola foto no se estira; nunca queda una foto sola en una fila; ver `wall.ts`).
- Trabajo sin fotos: bloque «Fotografías próximamente».
- Estados de error, vacío y paginación conservan el contrato de [PRODUCT.md](PRODUCT.md) con la misma tipografía.

### Movimiento

- **Entrada al hacer scroll** en titulares, bandas, fotos del muro y contacto: aparición con ligero desplazamiento vertical (18 px, 0,45 s) y escalonado de 60 ms entre fotos de una fila. Solo se oculta lo que queda bajo la primera pantalla, y solo con JavaScript (`RevealOnScroll`); sin JS todo es visible.
- Zoom muy leve (1,03) al pasar el ratón sobre una foto del muro.
- Con `prefers-reduced-motion: reduce` no hay entrada animada, ni zoom, ni pista del comparador.

### Reglas técnicas del visor y las imágenes

- Las vistas previas pueden recortar con `cover` y punto focal; al ampliar se muestra la imagen completa con `contain`, sin deformar.
- El visor (dialog nativo) va centrado respecto al viewport con `fixed/inset/margin:auto`, independiente del layout de la home, con contador, miniaturas, anterior/siguiente, cierre, Escape/flechas y retorno de foco. El diseño no lo modifica.
- Reservar espacio de imágenes y ajustar `sizes` al ancho realmente pintado (por foto del muro y para el comparador).

## Gestión privada

Compacta, funcional y mobile-first, priorizando operación cotidiana desde teléfono. Tipografía de interfaz Arial/Helvetica/sans-serif. Formularios con etiquetas visibles, errores útiles, progreso y reintento; los datos confirmados no deben perderse ni comunicar un guardado incompleto como éxito.

No introducir rediseños decorativos que reduzcan legibilidad, espacio de fotos, acceso a botones o rapidez de uso. Verde para acciones principales; borrados identificados con texto y confirmación, sin depender solo del color. El login comparte la identidad privada sin mostrar el marco de gestión antes de autenticar. El rediseño público no se aplica al privado.

El visor privado mantiene centrado robusto de dialog respecto al viewport (`fixed`, `inset:0`, `margin:auto`), fotografías `contain`, proporción real y controles accesibles. No acoplar cambios de su presentación al visor público sin comprobar ambos.

## Responsive y accesibilidad

Diseñar y verificar en este orden: **390 px principal → 768 px adaptación → 1440 px adaptación**. Los breakpoints reales del CSS responden al contenido. No diseñar desktop primero ni compactar más móvil para imitarlo.

Conservar objetivos táctiles de al menos 44 × 44 px, contraste, foco visible, etiquetas y nombres accesibles; Escape, flechas y retorno de foco del dialog nativo. Respetar reducción de movimiento y comprobar teclado abierto, zoom, overflow, orientación y estados de carga/vacío/error.

Verificar con fotografía vertical y horizontal real autorizada, sin cambios de producción para montar capturas. La emulación no sustituye una prueba física en Android/iPhone; no declarar esa QA sin ejecutarla.
