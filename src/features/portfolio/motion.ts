// Respaldo del movimiento ligado al scroll (lógica pura; lo aplica HomeMotion sin scroll-driven animations). Todo devuelve 0–1.
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
