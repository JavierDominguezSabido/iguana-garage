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

Home «de competición», elegida por el propietario con un test de gusto: sensación deportiva de competición, titulares en condensada industrial, oscuro con acento verde de marca, trabajos en mosaico, Antes y Después uno tras otro a pantalla completa, movimiento intenso (sin marquesinas ni textos en bucle), composición muy aireada y portada con un abanico de fotos. Composición centrada y movimiento continuo ligado al scroll. Implementación en `src/app/page.tsx`, `src/app/portfolio.css` y `src/features/portfolio/`.

### Límites que siguen vigentes

- **Marca:** assets oficiales y los cuatro colores base (más derivados: Iguana claro `#8FB04A` para hover y un Carbon más profundo `#080A09` bajo las fotos); sin azul ni tema claro.
- **Fotografía real:** solo las fotos publicadas del contrato público. Son fotos de móvil hechas en el taller (casi todas verticales, calidad y encuadre variables). Nada de stock, IA ni imágenes de relleno. Se recortan con `cover` y punto focal y desde 1100 px se igualan con un etalonaje común (`saturate(.8) contrast(1.08) brightness(.96)`; en pantallas pequeñas no, porque cada filtro cuesta una capa más al teléfono); el visor las muestra tal cual.
- **Datos y copy:** solo existen nombre, fecha, descripción opcional y fotos (con punto focal) por trabajo. No inventar categorías, códigos, teléfonos, redes, presupuestos, servicios ni promesas. Ningún dato ni nombre va fijo en el código: se corrigen desde `/app`.
- **Funcionalidad pública** de [PRODUCT.md](PRODUCT.md): trabajos paginados, transformación Antes/Después opcional, visor, contacto por WhatsApp con estado pendiente, estados de carga/vacío/error, sin login visible ni PWA.

### Tipografía

**Big Shoulders** (900, eje `opsz` a 72) para titulares y **Saira** (normal e itálica) para texto, botones y etiquetas, autoalojadas con `next/font` en `page.tsx` (variables `--font-pub-display` y `--font-pub-text`). Titulares en mayúsculas, interlineado ≈ .8–1 e inclinados con `skewX(-9deg)`, como la rotulación de carreras. Botones y etiquetas en Saira itálica, sin mayúsculas. Solo la home pública.

### Lenguaje visual

- **Paralelogramos:** CTA principal verde con texto Carbon, botones secundarios («Ver fotos», paginación) en Metal y etiquetas de fecha y número de fotos con los lados cortados en diagonal (`clip-path`). El foco se dibuja dentro del botón porque el recorte oculta el contorno.
- **Librea:** dos franjas verdes inclinadas al 20 % de opacidad detrás del titular de la portada; con movimiento se ensanchan e inclinan al abrir el abanico.
- **Logo** oficial servido por el optimizador de `next/image` (solo `/_next/static/media/**`) y recortado solo en su margen transparente.

### Estructura y orden

1. **Cabecera:** logo oficial. Sin número de WhatsApp válido, además, «Contacto ↗», que lleva a la sección de contacto.
2. **Portada:** titular centrado «Chapa y pintura.» (punto en verde) y CTA de WhatsApp, sin más texto. Debajo, las **cartas** de los trabajos: una por trabajo de la página (su primera foto visible, con el nombre en una banda hueso como una carta de colores); si hay menos de siete trabajos, completan el conjunto otras fotos de los mismos trabajos, decorativas (`aria-hidden`, sin foco). Cada carta principal es un enlace a la banda de su trabajo. Sin fotos no hay cartas y el titular se centra.
   - **Móvil y tablet (< 1100 px): carrusel.** Scroll horizontal nativo con `scroll-snap` (cada carta encaja centrada, de una en una), sin arrastre por JavaScript, centrado en el hueco bajo el CTA. La carta centrada va recta y las vecinas asoman inclinadas ±12° por los lados como pista de que hay más (la inclinación va en el cuerpo de la carta, no en la caja de encaje, y la marca `HeroFan` con un `IntersectionObserver`, sin leer medidas al desplazar). La pista lleva `overflow-y: hidden` para que un gesto vertical que empiece sobre las cartas siga bajando la página. Debajo, «‹ 2 / 7 ›»: botones «Carta anterior» y «Carta siguiente» (44 px, desactivados en los extremos) y un contador con la actual en verde, anunciado con `aria-live`; con el foco en una carta, ← y → pasan de carta. Tocar una carta lleva a su trabajo. Con «reducir movimiento», el mismo carrusel sin transiciones ni desplazamiento suave. Ancho de carta `min(64vw, 26svh)` en móvil y `min(44vw, 32svh)` desde 700. Comprobado en 375×667, 390×844, 412×915 y 768×1024.
   - **Escritorio (≥ 1100 px): abanico.** Nace del borde inferior y, con movimiento, se abre con el scroll. Las cartas giran sobre un arco ancho (pivote a 3,8 anchos de carta bajo cada una) y cada una sube lo que su giro la haría hundirse (`cos()`), así que todas apoyan en la misma línea y, abierto, se ve entero con los nombres legibles dentro de la portada, sin solaparse con el titular ni con la sección siguiente. Carta `min(250px, 24svh)`, apertura de 92°, nombre a 18 px (16 px entre 1100 y 1399, para que el de la carta izquierda no quede tapado). Con movimiento, además, un **indicador de scroll** sin texto a la derecha, a media altura: pista fina de 3 × 72 px inclinada como la librea, con una cuenta verde que baja; decorativo (`aria-hidden`), no tapa nada, se desvanece al empezar a abrirse el abanico y no existe con «reducir movimiento». Comprobado en 1920×1080, 1440×900, 1366×768, 1280×720 y 1100×700.
3. **Antes y Después** (solo con la pareja elegida en `/app` → Portada y solo en la página 1): dos pantallas completas, una tras otra, con «ANTES» en hueso y «DESPUÉS» en verde, el nombre y la fecha del trabajo y «Ver fotos» (visor abierto en el Después). Sin pareja válida no hay sección.
4. **«Trabajos realizados»:** titular centrado y una banda por trabajo (ver Mosaico).
5. **Contacto** («¿Hablamos de tu coche?», «Cuéntanos qué necesitas.» y CTA, o el aviso de contacto pendiente) y pie con logo, «Chapa y pintura.» y «Volver arriba».

Contenedor máximo de 1760 px. Márgenes laterales de 24 px (móvil), 48 px (≥700) y `clamp(64px, 8.4vw, 136px)` (≥1100). Mucho aire entre bloques: 22svh (26svh desde 1100).

### Mosaico de trabajos

- Cada trabajo es un `article` anclable (`#trabajo-{id}`) con una **banda**: nombre en grande, fecha y «N fotografías» en paralelogramos (la fecha en verde), descripción si existe y «Ver fotos» (visor en la primera foto).
- Sus fotos van en **dos columnas escalonadas** (la segunda empieza más abajo) con proporciones alternas 4:5, 1:1, 3:5, 3:4, `cover` y punto focal, contador `n/N`; una sola foto ocupa una columna de 520 px como máximo. Cada foto abre el visor en esa misma imagen.
- Desde 1100 px la banda va a la izquierda (5/12) y se queda fija (`sticky`) mientras pasan sus fotos a la derecha (7/12).
- El orden de los trabajos y de sus fotos lo fija el propietario en la pantalla «Portada». Las fotos ocultas no se pintan ni cuentan. Un trabajo sin ninguna foto visible no tiene banda.
- Estados de error, vacío y paginación conservan el contrato de [PRODUCT.md](PRODUCT.md).

### Botón flotante de WhatsApp

- Solo con número válido: botón **redondo** verde (62 px; 68 px desde 1100) abajo a la derecha, con el icono de WhatsApp y el nombre accesible «Escríbenos por WhatsApp (abre WhatsApp en otra pestaña)». Respeta el área segura.
- Se retira mientras se ve el titular de la portada, la sección de contacto o el pie (zonas `[data-fab-hide]`), para no duplicar el CTA, y con un visor abierto. Oculto es `visibility: hidden`: fuera del tabulador y del árbol de accesibilidad. Entra con giro y escala; con `prefers-reduced-motion`, sin transición.

### Imagen para compartir

Imagen Open Graph **estática y solo de marca**: logo oficial completo, a su proporción, sobre Carbon, más «CHAPA Y PINTURA.» en Big Shoulders 900 inclinada como en la home (punto en verde) y las dos franjas verdes de la librea detrás; sin fotos de trabajos. Es `public/share/iguana-garage-og.png` (1200×630), generada a mano con `scripts/prepare-og-image.mjs` (no se ejecuta en build ni en peticiones) y enlazada desde los metadatos de `/` (`og:image`, `twitter:image` y `twitter:card=summary_large_image`). La URL es absoluta: `metadataBase` usa `RENDER_EXTERNAL_URL` o, si falta, la URL de producción.

### Movimiento

Intenso pero sin bucles: solo responde a la carga y al scroll. Solo se anima `transform` (y sus propiedades `rotate`, `translate` y `scale`) u `opacity`: nunca `clip-path`, `filter`, `box-shadow`, tamaños ni posiciones.

- **Al cargar** (CSS, una vez): las dos líneas del titular suben desde su línea (1,1 s), la librea crece, la fila del CTA funde y las cartas se reparten desde abajo con rebote, escalonadas 70 ms.
- **Ligado al scroll:** solo con JavaScript y sin «reducir movimiento». `HomeMotion` marca la página con `data-motion="scroll"` cuando el navegador tiene **scroll-driven animations** (`animation-timeline`), y entonces todo lo hace el CSS en el compositor, sin JavaScript al desplazar. Si no las tiene, marca `data-motion="js"` y escribe `--p` y `--x` (`motion.ts`): listener pasivo, una sola escritura por fotograma con `requestAnimationFrame`, solo si el valor cambia, y las posiciones de las secciones medidas al cargar y al cambiar el tamaño (`ResizeObserver`), nunca en cada scroll.
  - **Portada** (solo escritorio): queda fijada 185svh mientras el abanico, anclado abajo, sube desde fuera de la pantalla y se abre, y el titular se encoge y se atenúa. Abierto del todo cabe entero en la pantalla. En móvil y tablet la portada no se fija: el carrusel ya está a la vista.
  - **Antes y Después:** la sección se fija 330svh; el Antes se queda quieto, la pista lo lleva en horizontal hasta el Después con unas rayas verdes de chicane entre ambos y el Después se queda quieto. Las fotos y los rótulos se desplazan a distinta velocidad. Un indicador «Antes / Después» se rellena de verde.
  - **Fotos del mosaico:** una tapa Carbon se retira hacia abajo mientras la foto sube por la pantalla (`view()`); desde 700 px, además, la foto pasa de 1,25 a 1.
  - **Columnas** (desde 700 px): se desplazan en sentidos opuestos (paralaje de ±45 px; ±90 px desde 1100). En móvil no, para que un teléfono modesto mueva menos capas a la vez.
  - **Titulares** de «Trabajos realizados» y del contacto: crecen al entrar, sin atenuarse (el contraste se mantiene siempre).
- **Sin JavaScript o con `prefers-reduced-motion: reduce`:** nada se fija ni se anima. La portada crece con su contenido: el abanico, abierto, va en el flujo debajo del titular (nunca lo solapa) y no hay indicador de scroll; el Antes y el Después son dos pantallas apiladas, todas las fotos se ven desde el principio y el botón flotante aparece sin transición.
- **Sin saltos de maquetación:** cada línea del titular va en una sola fila con interlineado fijo (el cambio de fuente no mueve nada), las cartas y las fotos reservan su proporción y las fotos fuera de pantalla cargan en diferido.
- **Imágenes de lo que se anima:** cartas, fotos del mosaico y Antes/Después piden como mucho la variante de 640 px (390/640 en un teléfono); solo el Antes/Después a pantalla completa en escritorio (≥ 1100 px) usa una fuente `<picture>` con todas las variantes preparadas. Sin `will-change` permanente.

### Visores de fotos (público y privado)

Los dos visores comparten estilo, estructura y comportamiento, pero cada uno conserva su piel. El componente base es `PhotoViewer` (`src/features/viewer/`): dialog nativo modal, teclado, tira deslizante, foco y miniaturas; quien lo usa pinta la foto y las miniaturas con sus propios loaders y variantes, y trae su propio CSS por prefijo (`pub-viewer` en `portfolio.css`, `app-viewer` en `src/app/app/app.css`). Los estilos no se comparten: se comprueban por separado.

- **Estilo común:** pantalla completa (dialog `fixed`, `inset: 0`, `margin: auto`, 100 % × 100dvh, centrado respecto al viewport e independiente del layout de la página), fondo casi opaco (≈95 %) y sin panel ni borde; el scroll de la página queda bloqueado mientras está abierto. La foto, con `contain`, ocupa todo el escenario (sin recortar ni deformar).
- **Cabecera:** título del trabajo a la izquierda, contador «2 / 3» y cierre arriba a la derecha (48 px, sin anillo; con teclado muestra foco visible en tono hueso/texto, nunca verde). Un `role="status"` oculto anuncia «Fotografía 2 de 3».
- **Flechas anterior/siguiente:** en escritorio (≥ 900 px), grandes (64 px) en columnas laterales a los lados de la foto; en móvil y tablet, compactas (44 px) sobre la foto. También flechas del teclado; Escape cierra y el foco vuelve al elemento que lo abrió. El deslizamiento se describe en «Tira de fotos».
- **Miniaturas** centradas debajo (56 px móvil, 64 px escritorio), con recorte `cover` y punto focal; la activa lleva borde verde y opacidad completa, las demás se atenúan (`aria-pressed`). Con una sola foto no hay flechas ni miniaturas.
- **Público (`pub-viewer`):** nombre del trabajo en Big Shoulders (mayúsculas), tokens del portfolio, loaders y variantes del portfolio; el botón flotante de WhatsApp queda oculto con el visor abierto.
- **Privado (`app-viewer`):** tiene su propia piel, con sus loaders y rutas `/app/api/photos`, sin estilos del portfolio. Hoy no ofrece acceso al original desde el visor (el endpoint `?original=1` existe, pero no se enlaza).
- **Tira de fotos:** el escenario es una tira horizontal con **solo tres fotos montadas** (actual, anterior y siguiente; nunca todas las del trabajo), cada una con el mismo `sizes`/variante que usará al mostrarse, para que al pasar ya estén descargadas y decodificadas. En táctil la tira sigue el dedo (el ratón no arrastra) y al soltar encaja en la vecina si el recorrido supera el umbral (20 % del ancho, entre 48 y 120 px) o hay velocidad de lanzamiento (≥ 0,5 px/ms con al menos 24 px); si no, vuelve a su sitio. Hacia un lado sin foto vecina hay resistencia elástica. `touch-action: pan-y` conserva el scroll vertical y un toque no cambia de foto. Flechas y teclado hacen la misma transición corta (≈ 0,22 s) y durante ella se ignora la entrada nueva. La lógica es `strip.ts` y `swipe.ts`.
- **Foto aún no lista:** nunca se muestra una foto distinta de la que indica el contador. Mientras la grande no está cargada y decodificada, su miniatura (ya cargada en la tira de miniaturas) se enseña al instante ampliada con `contain` y ligeramente difuminada, y se funde a la foto buena al estar lista. Si falla, aparece «Fotografía no disponible.» sobre la miniatura, con «Reintentar foto» (hasta 3 veces). No cambia la política de caché: las fotos siguen `private, no-store`.
- **Imágenes:** `sizes` sale de `viewerStageSizes` (alto disponible × proporción, restando cabecera, miniaturas y las columnas de flechas en escritorio). Con `prefers-reduced-motion` el cambio de foto es instantáneo, sin encaje animado ni fundido.
- Las vistas previas fuera del visor pueden recortar con `cover` y punto focal; al ampliar siempre se muestra la imagen completa. Reservar espacio de imágenes y ajustar `sizes` al ancho realmente pintado (abanico, Antes/Después, mosaico y visores).

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
- **Pantallas:** listado en rejilla continua de fotos 4:5 (2 → 3 → 4 → 5 columnas) con estado sobre la foto; ficha con la foto a la izquierda y la hoja de datos a la derecha desde 1000 px (el código de pintura destaca); formulario en dos paneles (datos y fotografías 4:5); Portada con la transformación como un comparador (dos fotos unidas por la costura verde con tirador) y el muro como filas numeradas, primero «En el muro» y al final «Sin publicar». El login es una tarjeta sobre Carbon con el formulario.
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
