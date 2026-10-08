// Gesto de deslizar en el visor táctil: devuelve 1 (siguiente), -1 (anterior) o 0 (no es un deslizamiento).
// Hace falta recorrido mínimo y que el gesto sea claramente horizontal para no confundirlo con un scroll.
export const SWIPE_MIN_DISTANCE = 48;
export const SWIPE_DOMINANCE = 1.5;

export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const horizontal = Math.abs(dx);
  if (horizontal < SWIPE_MIN_DISTANCE || horizontal < Math.abs(dy) * SWIPE_DOMINANCE) return 0;
  // El dedo se mueve hacia la izquierda: la foto siguiente entra por la derecha.
  return dx < 0 ? 1 : -1;
}
