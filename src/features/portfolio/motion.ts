// Movimiento de la home ligado al scroll (lógica pura; lo aplica HomeMotion). Todo devuelve 0–1.
export const clamp01 = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Sección fijada (sticky) más alta que la pantalla: 0 cuando su borde superior llega arriba, 1 al acabar su recorrido extra.
export function pinnedProgress(top: number, height: number, viewport: number): number {
  return clamp01(-top / Math.max(1, height - viewport));
}
// Antes/Después: el Antes se queda quieto un tramo, cruza con suavidad y el Después se queda quieto otro tramo.
const HOLD = 0.26;
export function crossing(progress: number): number {
  return easeInOut(clamp01((clamp01(progress) - HOLD) / (1 - 2 * HOLD)));
}
// Destapado de una foto: empieza cuando su borde superior asoma por abajo y termina tras recorrer el 45 % de la pantalla.
export function revealProgress(top: number, viewport: number): number {
  return clamp01((viewport - top) / (viewport * 0.45));
}
// Paso de un bloque por la pantalla: 0 cuando asoma por abajo, 1 cuando sale por arriba (paralaje de columnas).
export function passProgress(top: number, height: number, viewport: number): number {
  return clamp01((viewport - top) / (viewport + height));
}
// Inercia: cada fotograma recorre una fracción de lo que falta; muy cerca, llega exacto y se detiene.
export function follow(value: number, target: number, rate = 0.13): number {
  const next = value + (target - value) * rate;
  return Math.abs(target - next) < 0.0004 ? target : next;
}
