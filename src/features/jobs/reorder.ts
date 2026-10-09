// Lógica pura del arrastre y de los atajos de teclado de la fila de fotos (sin DOM, para poder probarla).
export const LONG_PRESS_MS = 400;       // táctil: mantener pulsado antes de arrastrar
export const TOUCH_SLOP = 10;           // táctil: si el dedo se mueve más antes del tiempo, es un desplazamiento
export const MOUSE_DRAG_THRESHOLD = 5;  // ratón: píxeles para empezar a arrastrar
export const EDGE_ZONE = 48;            // píxeles del borde de la fila donde se desplaza sola
export const EDGE_MAX_SPEED = 14;       // píxeles por fotograma

// Mueve un elemento de `from` a `to` (índice final) sin mutar la lista.
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// Índice final del elemento arrastrado según la posición X del puntero y los centros de todas las piezas (incluida la
// arrastrada): cuenta cuántas de las demás quedan a la izquierda del puntero.
export function dropIndex(centers: readonly number[], x: number, from: number): number {
  let before = 0;
  centers.forEach((center, index) => { if (index !== from && center < x) before += 1; });
  return before;
}

// Velocidad de desplazamiento automático (px/fotograma, negativa = izquierda) cuando el puntero está cerca de un borde.
export function edgeScrollSpeed(x: number, left: number, right: number, zone = EDGE_ZONE, max = EDGE_MAX_SPEED): number {
  if (x < left + zone) return -Math.min(max, Math.max(1, Math.round(((left + zone - x) / zone) * max)));
  if (x > right - zone) return Math.min(max, Math.max(1, Math.round(((x - (right - zone)) / zone) * max)));
  return 0;
}

// Mayús + flecha izquierda/derecha mueve la foto enfocada; devuelve el índice de destino o null si no aplica.
export function keyboardTarget(key: string, shiftKey: boolean, index: number, length: number): number | null {
  if (!shiftKey) return null;
  const target = key === "ArrowLeft" ? index - 1 : key === "ArrowRight" ? index + 1 : null;
  return target !== null && target >= 0 && target < length ? target : null;
}

// Movimiento táctil: ¿el dedo ya se ha movido lo bastante como para tratarlo como desplazamiento y no como pulsación larga?
export function movedBeyond(dx: number, dy: number, threshold: number): boolean {
  return Math.hypot(dx, dy) > threshold;
}
