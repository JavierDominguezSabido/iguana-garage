import { expect, it } from "vitest";
import { COMPARE_MAX, COMPARE_MIN, COMPARE_START, clampCompare, compareAt, compareDrag, compareFromKey, compareValueText, hintOffset } from "./compare";

it("la barra nunca llega a los bordes: se limita a un margen seguro y un valor inválido vuelve al centro", () => {
  expect(COMPARE_MIN).toBeGreaterThan(0); expect(COMPARE_MAX).toBeLessThan(100);
  expect(clampCompare(-20)).toBe(COMPARE_MIN); expect(clampCompare(0)).toBe(COMPARE_MIN);
  expect(clampCompare(100)).toBe(COMPARE_MAX); expect(clampCompare(500)).toBe(COMPARE_MAX);
  expect(clampCompare(40)).toBe(40);
  for (const bad of [NaN, Infinity, -Infinity]) expect(clampCompare(bad)).toBe(COMPARE_START);
});

it("el teclado usa flechas, Re Pág/Av Pág, Inicio y Fin y deja pasar el resto de teclas", () => {
  expect(compareFromKey(50, "ArrowRight", false)).toBe(54);
  expect(compareFromKey(50, "ArrowLeft", false)).toBe(46);
  expect(compareFromKey(50, "ArrowUp", false)).toBe(54);
  expect(compareFromKey(50, "ArrowDown", false)).toBe(46);
  expect(compareFromKey(50, "ArrowRight", true)).toBe(60);
  expect(compareFromKey(50, "PageUp", false)).toBe(60);
  expect(compareFromKey(50, "PageDown", false)).toBe(40);
  expect(compareFromKey(50, "Home", false)).toBe(COMPARE_MIN);
  expect(compareFromKey(50, "End", false)).toBe(COMPARE_MAX);
  expect(compareFromKey(COMPARE_MAX, "ArrowRight", false)).toBe(COMPARE_MAX);
  expect(compareFromKey(COMPARE_MIN, "ArrowLeft", true)).toBe(COMPARE_MIN);
  expect(compareFromKey(50, "Tab", false)).toBeUndefined();
  expect(compareFromKey(50, "Enter", false)).toBeUndefined();
});

it("el texto del valor describe cuánto se ve del antes y del después", () => {
  expect(compareValueText(50)).toBe("Antes 50 %, Después 50 %");
  expect(compareValueText(33.6)).toBe("Antes 34 %, Después 66 %");
});

it("el puntero se traduce a porcentaje del ancho; el arrastre táctil es relativo y no salta", () => {
  expect(compareAt(200, 100, 200)).toBe(COMPARE_START);
  expect(compareAt(100, 100, 200)).toBe(COMPARE_MIN);
  expect(compareAt(300, 100, 200)).toBe(COMPARE_MAX);
  expect(compareAt(150, 100, 0)).toBe(COMPARE_START);
  expect(compareDrag(50, 200, 200, 400)).toBe(50);
  expect(compareDrag(50, 200, 240, 400)).toBe(60);
  expect(compareDrag(50, 200, 100, 400)).toBe(25);
  expect(compareDrag(50, 200, 900, 400)).toBe(COMPARE_MAX);
  expect(compareDrag(50, 200, 240, 0)).toBe(50);
});

it("la pista de uso sale del reposo, avanza un poco y vuelve exactamente al punto de partida", () => {
  expect(hintOffset(0)).toBe(0); expect(hintOffset(1)).toBeCloseTo(0, 10);
  expect(hintOffset(-1)).toBe(0); expect(hintOffset(2)).toBeCloseTo(0, 10);
  const peak = hintOffset(0.5);
  expect(peak).toBeGreaterThan(5); expect(peak).toBeLessThan(20);
  for (let step = 0; step <= 20; step++) expect(Math.abs(hintOffset(step / 20))).toBeLessThanOrEqual(peak + 1e-9);
  expect(COMPARE_START + peak).toBeLessThanOrEqual(COMPARE_MAX);
});
