# Iguana Garage — dirección de diseño

## Referencias y alcance

`references/desktop/` y `references/mobile/` son la dirección visual aprobada. Interpretar personalidad, jerarquía, sensación, simplicidad y coherencia; no copiar píxeles. `PRODUCT.md` delimita funcionalidades.

- Desktop: 6 PNG — home, listado, alta, detalle, edición y login.
- Mobile: 6 PNG de 941 × 1672 — dos homes, listado, alta, detalle y login. Falta edición móvil; proponer adaptación del formulario móvil de alta.
- Home `01-home-iguana-garage-mobile1.png` muestra teléfono y trabajos en filas; `01-home-iguana-garage-mobile.png` mantiene secciones anchas y cuatro tarjetas en paralelo. Confirmar composición pública durante diseño.
- Marcos de teléfono, barras del sistema y fondo exterior son presentación del mockup, no UI ni medidas CSS.

Descripciones por trabajo, filtros, selector de vistas, límites de fotos y enlaces a casos no amplían el alcance. «Ver trabajos» puede desplazarse a la galería de `/`; ampliar fotos dentro de esa página. Antes/proceso/después no implica estados ni categorías obligatorias. Textos ingleses/fechas de las capturas son ilustrativos.

## Lenguaje visual

Dirección observada: carbón casi negro, superficies oscuras con matiz verde, texto claro/gris secundario, acentos verde lima, bordes finos y esquinas suaves. Fotografías protagonistas, títulos sans serif marcados y texto breve.

Portfolio expresivo; gestión privada legible y rápida. Formularios sobre superficies estables, con contraste comprobado. Verde para acción principal; rojo con texto/confirmación para borrar. No depender de color, hover o iconos sin nombre accesible. Movimiento discreto respetando reducción de movimiento.

Sin fuentes ni tokens oficiales entregados: proponer una sans serif disponible y una escala/paleta pequeñas al implementar. No inventar tipografía de marca ni añadir librerías decorativas.

## Mobile-first y responsive

- Diseñar primero los recorridos en teléfono, priorizando referencias móviles para privado. Formularios en una columna, etiquetas visibles, errores junto al campo y datos conservados ante fallo.
- Acción principal alcanzable con teclado abierto. Proponer objetivos táctiles de 44 × 44 CSS px; revisar foco, zoom, textos largos y zonas seguras.
- Galería utilizable con tacto, teclado y lector de pantalla. Proponer ficha móvil con medio, datos y acciones; distinguir borrado con confirmación.
- Adaptar específicamente escritorio: anchuras, galería, formularios y acciones pueden tener composiciones distintas. Compartir comportamiento/marca, sin equivalencia 1:1.
- Breakpoints según contenido. Verificar teléfonos estrechos/anchos, tamaños intermedios y escritorio, sin desbordamiento ni dependencia de hover.
- Diseñar carga, vacío, error y progreso de subida. Verificar fotos reales y móvil real.

## Assets oficiales

Solo usar `assets/brand/`:

| PNG | Tamaño |
| --- | --- |
| `iguana-garage-logo-horizontal.png` | 2172 × 724 |
| `iguana-garage-wordmark.png` | 2172 × 724 |
| `iguana-garage-symbol.png` | 1312 × 1199 |

Los tres tienen transparencia. Logo/wordmark presentan márgenes amplios y textura/bordes diferentes del logo limpio de las capturas: revisar lectura a tamaño real sin retocarlos. Escalar proporcionalmente; no estirar, recolorear, trazar, redibujar ni regenerar el lagarto. No extraer marca del mockup. Sin vector ni lema como asset separado.

## Fotografía

14 WebP de 1080 × 1350 (4:5), todos verticales: Mercedes Clase E (4), paragolpes Mercedes (3), llantas Audi A3 (2) y Suzuki Vitara (5). Preparación, piezas, detalles y resultados en entorno doméstico/taller; luz variable y algunas fotos poco nítidas. No hay vídeos ni hero panorámico equivalente a las referencias.

- Admitir verticales, horizontales y mezcladas sin exigir fotografías profesionales. Preservar proporciones y reparación relevante: recorte CSS en tarjetas cuando sirva, imagen completa en galería.
- Reservar espacio por dimensiones y cargar tamaños adecuados progresivamente; evitar todas las fotos a máxima resolución al abrir un listado móvil.
- Separar texto/foto si no hay encuadre adecuado. No forzar una vertical como hero panorámico ni sustituir material real por stock/generación premium.
- No asumir comparaciones por nombres: el Mercedes `result` aún muestra piezas sin montar. No inventar resultados ni mezclar trabajos como una reparación.
- Seleccionar conscientemente fotos con matrículas/elementos particulares antes de publicar. Conservar originales; tratamientos futuros solo en derivados acordados.

**Preservar íntegros `assets/` y `references/`:** no modificar, renombrar, mover ni borrar. No copiarlos automáticamente a carpetas públicas para imitar los mockups.
