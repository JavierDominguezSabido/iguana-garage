// Lógica pura del comparador Antes/Después (la posición se expresa como % del antes visible).
// La barra se mantiene lejos de los bordes para no chocar con el gesto de «atrás» del móvil.
export const COMPARE_MIN = 14;
export const COMPARE_MAX = 86;
export const COMPARE_START = 50;
const KEY_STEP = 4;
const KEY_STEP_LARGE = 10;
const HINT_AMPLITUDE = 12;

export function clampCompare(value: number): number {
  if (!Number.isFinite(value)) return COMPARE_START;
  return Math.min(COMPARE_MAX, Math.max(COMPARE_MIN, value));
}
export function compareFromKey(value: number, key: string, shift: boolean): number | undefined {
  const step = shift ? KEY_STEP_LARGE : KEY_STEP;
  switch (key) {
    case "ArrowRight": case "ArrowUp": return clampCompare(value + step);
    case "ArrowLeft": case "ArrowDown": return clampCompare(value - step);
    case "PageUp": return clampCompare(value + KEY_STEP_LARGE);
    case "PageDown": return clampCompare(value - KEY_STEP_LARGE);
    case "Home": return COMPARE_MIN;
    case "End": return COMPARE_MAX;
    default: return undefined;
  }
}
export function compareValueText(value: number): string {
  const before = Math.round(value);
  return `Antes ${before} %, Después ${100 - before} %`;
}
// Ratón: la barra sigue al puntero.
export function compareAt(clientX: number, left: number, width: number): number {
  if (!(width > 0)) return COMPARE_START;
  return clampCompare(((clientX - left) / width) * 100);
}
// Táctil: desplazamiento relativo desde donde empezó el gesto, sin saltos.
export function compareDrag(startValue: number, startX: number, clientX: number, width: number): number {
  if (!(width > 0)) return clampCompare(startValue);
  return clampCompare(startValue + ((clientX - startX) / width) * 100);
}
// Pista de uso: desplazamiento del reposo (t = 0..1) que sale y vuelve al mismo punto.
export function hintOffset(t: number): number {
  const progress = Math.min(1, Math.max(0, t));
  return HINT_AMPLITUDE * Math.sin(Math.PI * progress);
}
