// Decisión al soltar un gesto de deslizar en el visor táctil: 1 (siguiente), -1 (anterior) o 0 (no encaja: vuelve a su sitio).
// Encaja por distancia (una fracción del ancho, entre 48 y 120 px) o por velocidad (un gesto rápido con algo de recorrido),
// siempre que sea claramente horizontal para no confundirlo con un scroll.
export const SWIPE_MIN_DISTANCE = 48;
export const SWIPE_MAX_DISTANCE = 120;
export const SWIPE_WIDTH_FRACTION = 0.2;
export const SWIPE_DOMINANCE = 1.5;
export const SWIPE_FLICK_VELOCITY = 0.5; // px/ms
export const SWIPE_FLICK_MIN_DISTANCE = 24;

export function swipeDirection(dx: number, dy: number, options: { width?: number; velocity?: number } = {}): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const horizontal = Math.abs(dx);
  if (horizontal < Math.abs(dy) * SWIPE_DOMINANCE) return 0;
  const { width, velocity } = options;
  const distance = width && width > 0 ? Math.min(SWIPE_MAX_DISTANCE, Math.max(SWIPE_MIN_DISTANCE, width * SWIPE_WIDTH_FRACTION)) : SWIPE_MIN_DISTANCE;
  const flick = velocity !== undefined && Number.isFinite(velocity) && Math.abs(velocity) >= SWIPE_FLICK_VELOCITY && horizontal >= SWIPE_FLICK_MIN_DISTANCE;
  if (horizontal < distance && !flick) return 0;
  // El dedo se mueve hacia la izquierda: la foto siguiente entra por la derecha.
  return dx < 0 ? 1 : -1;
}
