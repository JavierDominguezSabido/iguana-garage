# Iguana Garage — decisiones visuales

## Identidad

Identidad oficial inmutable; la identidad y la home pública son **siempre oscuras**, sin azul ni tema claro (el área privada se rige por los límites de «Gestión privada»). [PRODUCT.md](PRODUCT.md) delimita funciones y [AGENTS.md](AGENTS.md) la operación.

| Color oficial | Valor |
| --- | --- |
| Iguana Green | `#7A9A3A` |
| Carbon | `#0E1110` |
| Bone | `#F8F4DA` |
| Metal | `#2A2D2B` |

Estos cuatro colores son la base de la marca. El portfolio público puede derivar matices de ellos (opacidades, tonos más claros u oscuros del mismo color) si el diseño lo necesita, sin introducir azul ni colores ajenos a la marca. PWA usa Carbon. Estas restricciones cromáticas valen para la identidad y la home pública; el área privada se rige por «Gestión privada».

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

**Barlow Condensed** (600/700/800) para titulares y **Barlow** (400/500/600) para texto y etiquetas, autoalojadas con `next/font` en `page.tsx` (variables `--font-pub-display` y `--font-pub-text`, con Arial como respaldo). Titulares en mayúsculas con interlineado ≈ .84–1; etiquetas pequeñas en mayúsculas con tracking .12em. Contrasta con la geometría ancha del logo en lugar de imitarla. Solo la home pública.

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
- La pareja la elige el propietario en `/app` (ver «Gestión privada»); sin selección válida, la portada queda con el título solo.
- Es un `role="slider"` con nombre «Comparador Antes y Después: {trabajo}», `aria-valuenow/min/max` y `aria-valuetext` («Antes 58 %, Después 42 %»). Teclado: flechas ±4 (Mayús ±10), Re Pág/Av Pág ±10, Inicio y Fin.
- **Solo se arrastra, no se toca para abrir.** Debajo, un botón visible «Ver fotos» abre el visor del trabajo. Lleva un icono de fotos y no la flecha ↗, que sugiere un enlace externo (solo los enlaces a WhatsApp la llevan). No hay umbral arrastre/toque.
- `touch-action: pan-y`: el scroll vertical de la página funciona siempre, también empezando sobre la foto; solo se captura el gesto horizontal. En táctil el arrastre es relativo (sin saltos); con ratón la barra sigue al puntero.
- La barra se mantiene entre el 14 % y el 86 % del ancho para no chocar con el gesto de «atrás». Tirador de 52 px, verde con anillo, siempre visible.
- Pista de uso: al entrar en pantalla la barra se desplaza sola ≈12 puntos y vuelve, una sola vez; se cancela si la persona interactúa. Sin pista con `prefers-reduced-motion`.
- Las fotos Antes/Después no tienen por qué estar alineadas (distinto ángulo de cámara): es inherente al material y no se recorta ni corrige.

### Muro de trabajos

- Cada trabajo es un `article` con una **banda** (borde superior verde de 3 px, nombre en mayúsculas, fecha larga y «N fotografías», y la descripción si existe) y todas sus fotos a la vista. Una foto abre el visor en esa misma imagen.
- Fotos en recuadros 4:5 con `cover` y punto focal, separados 2 px, con contador `n/N`. Móvil/tablet (<900): dos columnas y, si el número de fotos es impar, la primera a todo el ancho. Desde 900: 12 columnas con filas de hasta cuatro fotos (4 por fila → 3 columnas cada una, 3 → 4, 2 → 6; una sola foto no se estira; nunca queda una foto sola en una fila; ver `wall.ts`).
- El orden de los trabajos lo fija el propietario en la pantalla «Portada» (sin insignia ni cambio visual): un trabajo recién publicado va el primero. Las fotos ocultas desde `/app` no se pintan ni cuentan en «N fotografías», y siguen el orden que el propietario fija en la pantalla «Portada».
- Un trabajo sin ninguna foto visible no tiene banda en el muro (no hay estado «Fotografías próximamente»).
- Estados de error, vacío y paginación conservan el contrato de [PRODUCT.md](PRODUCT.md) con la misma tipografía.

### Botón fijo de WhatsApp (móvil)

- Solo por debajo de 700 px y solo con número de WhatsApp válido: botón verde a todo el ancho (12 px de margen, 52 px de alto, respeta el área segura) con «Escríbenos por WhatsApp ↗».
- Aparece cuando el título sale de pantalla. Se retira al llegar a «contacto» o al pie, para no tapar el contenido final ni duplicar el CTA, y mientras hay un visor abierto (el dialog modal ya lo deja inerte y debajo de su fondo; el CSS lo oculta además con `:has(dialog[open])`).
- Oculto es `visibility: hidden`: fuera del orden de tabulación y del árbol de accesibilidad. Entra con un desplazamiento de 16 px y fundido (0,22 s); con `prefers-reduced-motion` aparece sin transición.

### Imagen para compartir

Imagen Open Graph **estática y solo de marca**: logo oficial completo, a su proporción, sobre Carbon, más «CHAPA Y PINTURA» en Barlow Condensed 800; sin fotos de trabajos. Es `public/share/iguana-garage-og.png` (1200×630), generada a mano con `scripts/prepare-og-image.mjs` (no se ejecuta en build ni en peticiones) y enlazada desde los metadatos de `/` (`og:image`, `twitter:image` y `twitter:card=summary_large_image`). La URL es absoluta: `metadataBase` usa `RENDER_EXTERNAL_URL` o, si falta, la URL de producción.

### Movimiento

- **Título:** al cargar, sus dos líneas suben escalonadas (0,38 em y fundido, 0,75 s, la segunda con 0,12 s de retardo), una sola vez y solo con CSS.
- **Entrada al hacer scroll** en titulares, bandas y contacto: aparición con ligero desplazamiento vertical (18 px, 0,45 s). Solo se oculta lo que queda bajo la primera pantalla, y solo con JavaScript (`RevealOnScroll`); sin JS todo es visible.
- **Entrada de las fotos del muro:** cada foto sube y aparece (24 px y de opacidad 0 a 1, 0,5 s, escalonado de 60 ms entre fotos de una fila), una sola vez, y **no empieza hasta que la imagen está cargada y decodificada** (evento `load` + `decode()`, no un temporizador). Mientras carga, el hueco ya reservado (4:5, sin saltos de maquetación) muestra Metal con un brillo de carga sutil. Si la foto termina de cargar cuando ya está en pantalla aparece solo con fundido, sin desplazamiento. Solo anima `transform` y `opacity`; se mueve la capa de la foto, no el hueco. Estados `data-wall` = `loading` | `queued` | `rise` | `fade` (lógica pura en `photo-entry.ts`, gestión en `RevealOnScroll`); el atributo se retira al terminar. Si `decode()` de una imagen ya cargada no resolviera, se libera tras 1,5 s para que ninguna foto quede invisible. Un recorrido muy rápido puede saltarse un recuadro: espera en cola y sube al acercarse de nuevo.
- Zoom muy leve (1,03) al pasar el ratón sobre una foto del muro.
- Con `prefers-reduced-motion: reduce` no hay título animado, ni entrada animada, ni brillo de carga, ni zoom, ni pista del comparador, ni transiciones del visor o del botón fijo: la foto aparece directamente al cargar y todo se ve desde el principio.

### Visores de fotos (público y privado)

Los dos visores comparten estilo, estructura y comportamiento, pero cada uno conserva su piel. El componente base es `PhotoViewer` (`src/features/viewer/`): dialog nativo modal, teclado, tira deslizante, foco y miniaturas; quien lo usa pinta la foto y las miniaturas con sus propios loaders y variantes, y trae su propio CSS por prefijo (`pub-viewer` en `portfolio.css`, `app-viewer` en `src/app/app/app.css`). Los estilos no se comparten: se comprueban por separado.

- **Estilo común:** pantalla completa (dialog `fixed`, `inset: 0`, `margin: auto`, 100 % × 100dvh, centrado respecto al viewport e independiente del layout de la página), fondo casi opaco (≈95 %) y sin panel ni borde; el scroll de la página queda bloqueado mientras está abierto. La foto, con `contain`, ocupa todo el escenario (sin recortar ni deformar).
- **Cabecera:** título del trabajo a la izquierda, contador «2 / 3» y cierre arriba a la derecha (48 px, sin anillo; con teclado muestra foco visible en tono hueso/texto, nunca verde). Un `role="status"` oculto anuncia «Fotografía 2 de 3».
- **Flechas anterior/siguiente:** en escritorio (≥ 900 px), grandes (64 px) en columnas laterales a los lados de la foto; en móvil y tablet, compactas (44 px) sobre la foto. También flechas del teclado; Escape cierra y el foco vuelve al elemento que lo abrió. El deslizamiento se describe en «Tira de fotos».
- **Miniaturas** centradas debajo (56 px móvil, 64 px escritorio), con recorte `cover` y punto focal; la activa lleva borde verde y opacidad completa, las demás se atenúan (`aria-pressed`). Con una sola foto no hay flechas ni miniaturas.
- **Público (`pub-viewer`):** nombre del trabajo en Barlow Condensed (mayúsculas), tokens del portfolio, loaders y variantes del portfolio; el botón fijo de WhatsApp queda oculto con el visor abierto.
- **Privado (`app-viewer`):** tiene su propia piel, con sus loaders y rutas `/app/api/photos`, sin estilos del portfolio. Hoy no ofrece acceso al original desde el visor (el endpoint `?original=1` existe, pero no se enlaza).
- **Tira de fotos:** el escenario es una tira horizontal con **solo tres fotos montadas** (actual, anterior y siguiente; nunca todas las del trabajo), cada una con el mismo `sizes`/variante que usará al mostrarse, para que al pasar ya estén descargadas y decodificadas. En táctil la tira sigue el dedo (el ratón no arrastra) y al soltar encaja en la vecina si el recorrido supera el umbral (20 % del ancho, entre 48 y 120 px) o hay velocidad de lanzamiento (≥ 0,5 px/ms con al menos 24 px); si no, vuelve a su sitio. Hacia un lado sin foto vecina hay resistencia elástica. `touch-action: pan-y` conserva el scroll vertical y un toque no cambia de foto. Flechas y teclado hacen la misma transición corta (≈ 0,22 s) y durante ella se ignora la entrada nueva. La lógica es `strip.ts` y `swipe.ts`.
- **Foto aún no lista:** nunca se muestra una foto distinta de la que indica el contador. Mientras la grande no está cargada y decodificada, su miniatura (ya cargada en la tira de miniaturas) se enseña al instante ampliada con `contain` y ligeramente difuminada, y se funde a la foto buena al estar lista. Si falla, aparece «Fotografía no disponible.» sobre la miniatura, con «Reintentar foto» (hasta 3 veces). No cambia la política de caché: las fotos siguen `private, no-store`.
- **Imágenes:** `sizes` sale de `viewerStageSizes` (alto disponible × proporción, restando cabecera, miniaturas y las columnas de flechas en escritorio). Con `prefers-reduced-motion` el cambio de foto es instantáneo, sin encaje animado ni fundido.
- Las vistas previas fuera del visor pueden recortar con `cover` y punto focal; al ampliar siempre se muestra la imagen completa. Reservar espacio de imágenes y ajustar `sizes` al ancho realmente pintado (muro, comparador y visores).

## Gestión privada

Abierta a rediseño completo, igual que la home pública. Es una app de gestión normal que su propietario usa con calma: sube las fotos cuando las tiene, las ordena y publica. No se optimiza para uso con una mano ni con prisa. Estructura, navegación, composición, tipografía, paleta y movimiento los decide el rediseño; `globals.css` solo guarda la base común con la home pública; los estilos de la gestión viven en `src/app/app/app.css`, todos bajo `.app`.

### Límites que siguen vigentes

- **Marca:** el logo oficial de `assets/brand` no se modifica y debe verse bien y entero sobre el fondo elegido. Paleta: solo los cuatro colores de la marca sobre fondo oscuro (Carbon de fondo, Metal en superficies, Bone para el texto, Iguana Green de acento) y tonos derivados de ellos; sin azul ni colores ajenos, tampoco rojo para borrar.
- **Funciones:** las de [PRODUCT.md](PRODUCT.md). No inventar funciones ni datos.
- **Accesibilidad:** objetivos táctiles de al menos 44 × 44 px, contraste, foco visible, etiquetas y nombres accesibles, teclado y `prefers-reduced-motion`.
- **Formularios y datos:** etiquetas visibles, errores útiles, progreso y reintento. Los datos confirmados no se pierden ni se comunica un guardado incompleto como éxito.
- **Acciones destructivas:** los borrados se identifican con texto y confirmación, sin depender solo del color. Los estados («Privado», «En portada», «Oculta», «Antes», «Después») se distinguen también con texto.
- **Login:** comparte la identidad privada sin mostrar el marco de gestión antes de autenticar.

### Dirección actual: mate y barniz

En el taller, la última capa es el barniz: lo que da brillo. La gestión usa esa idea como sistema. Implementación en `src/app/app/app.css`, `src/app/app/` y `src/features/workspace/`.

- **Mate y barniz:** el contenido es mate (Carbon de fondo, paneles Metal sin brillo). Todo lo que actúa flota abajo como una capa de barniz translúcida (Carbon con transparencia, desenfoque y un filo de luz arriba): el dock, la barra de guardado de los formularios, la bandeja de la foto seleccionada en Portada y los avisos.
- **Brillo = sale en la web:** lo publicado lleva verde Iguana y un reflejo especular (etiqueta «Publicado» con punto verde; tarjetas con filo de luz); lo privado es mate («Privado» con punto hueco). Lo oculto o vacío se marca con un rayado fino en tono hueso («Oculta», sin fotos, avisos de error).
- **Tipografía:** Hubot Sans (técnica, de taller) para titulares, posiciones del muro y código de pintura; Mona Sans para texto e interfaz. Autoalojadas con `next/font` en `src/app/app/layout.tsx`. Sin etiquetas en mayúsculas.
- **Marco:** cabecera mínima (logo y «Cerrar sesión») y un **dock flotante** abajo y centrado en todas las anchuras: «Trabajos», «Portada» y «Nuevo trabajo». En alta y edición el dock cede su sitio a la barra de guardado («Cancelar» / «Guardar trabajo»), con la misma forma y lugar.
- **Pantallas:** listado en rejilla continua de fotos 4:5 (2 → 3 → 4 → 5 columnas) con estado sobre la foto; ficha con la foto a la izquierda y la hoja de datos a la derecha desde 1000 px (el código de pintura destaca); formulario en dos paneles (datos y fotografías 4:5); Portada con la transformación como el comparador público (dos fotos unidas por la costura verde con tirador) y el muro como filas numeradas, primero «En el muro» y al final «Sin publicar». El login es una tarjeta sobre Carbon con el formulario.
- **Botones:** píldoras. Principal en verde; secundario con contorno; borrar es texto subrayado con icono y, en la confirmación, botón hueso con texto explícito.
- **Movimiento:** solo responde a acciones. Al publicar un trabajo en Portada (y al activar «Publicar en portfolio») pasa una única franja de brillo, como una mano de barniz; el login la tiene una vez al cargar. Con `prefers-reduced-motion` no hay brillo, ni zoom, ni entrada de la bandeja, y los avisos no se retiran solos.

### Contrato funcional de `/app/portada`

- Tarjeta de la transformación en portada (Antes y Después) y una sección por trabajo con su nombre, fecha, «N en el muro de M», su posición en el muro y marcas de texto «Privado», «En portada» y «No sale en el muro».
- Interruptor «Publicado» por trabajo. Las demás acciones solo existen en los publicados.
- Orden de los trabajos publicados por arrastre de un asa (táctil: mantener pulsado ~0,4 s y mover; ratón: arrastrar; teclado: Mayús + ↑/↓) y con botones ↑/↓. Marcador de destino y desplazamiento automático en los bordes.
- Fotos de cada trabajo: reordenar arrastrando, con ←/→ y con Mayús + ←/→; ocultar o mostrar en el muro; usar como Antes o Después.
- Cada movimiento se anuncia de forma accesible («Foto movida a la posición 2 de 7»). Sin texto de ayuda visible: las instrucciones las leen los lectores de pantalla (`aria-describedby`).
- Los trabajos privados van al final, atenuados y sin acciones de foto.
- La ficha del trabajo solo muestra una línea de estado de portada y el enlace «Gestionar en Portada».

### Visor privado

Usa el mismo componente base que el público (ver «Visores de fotos») con su propia piel `app-viewer`: dialog centrado respecto al viewport, fotografías `contain`, proporción real y controles accesibles. Un cambio en el componente base o en una piel exige comprobar ambos visores por separado.

## Responsive y accesibilidad

Home pública: diseñar y verificar en este orden: **390 px principal → 768 px adaptación → 1440 px adaptación**. Los breakpoints reales del CSS responden al contenido. No diseñar desktop primero ni compactar más móvil para imitarlo. Área privada: debe funcionar bien desde 390 px hasta escritorio, sin una resolución principal.

Conservar objetivos táctiles de al menos 44 × 44 px, contraste, foco visible, etiquetas y nombres accesibles; Escape, flechas y retorno de foco del dialog nativo. Respetar reducción de movimiento y comprobar teclado abierto, zoom, overflow, orientación y estados de carga/vacío/error.

Verificar con fotografía vertical y horizontal real autorizada, sin cambios de producción para montar capturas. La emulación no sustituye una prueba física en Android/iPhone; no declarar esa QA sin ejecutarla.
