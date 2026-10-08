import { expect, it } from "vitest";
import { SWIPE_MIN_DISTANCE, swipeDirection } from "./swipe";

it("deslizar el dedo a la izquierda avanza y a la derecha retrocede", () => {
  expect(swipeDirection(-90, 4)).toBe(1);
  expect(swipeDirection(90, -6)).toBe(-1);
  expect(swipeDirection(-SWIPE_MIN_DISTANCE, 0)).toBe(1);
  expect(swipeDirection(SWIPE_MIN_DISTANCE, 0)).toBe(-1);
});

it("un gesto corto, un toque o un movimiento casi vertical no cambia de foto", () => {
  expect(swipeDirection(0, 0)).toBe(0);
  expect(swipeDirection(-(SWIPE_MIN_DISTANCE - 1), 0)).toBe(0);
  expect(swipeDirection(60, 60)).toBe(0);
  expect(swipeDirection(-70, 50)).toBe(0);
  expect(swipeDirection(-20, 300)).toBe(0);
});

it("con un gesto claramente horizontal, una ligera deriva vertical sigue contando", () => {
  expect(swipeDirection(-120, 40)).toBe(1);
  expect(swipeDirection(120, -40)).toBe(-1);
});

it("valores inválidos se ignoran", () => {
  for (const [dx, dy] of [[NaN, 0], [0, NaN], [Infinity, 0], [-Infinity, 5]]) expect(swipeDirection(dx, dy)).toBe(0);
});

it("al soltar, encaja si el recorrido supera una fracción del ancho (entre 48 y 120 px)", () => {
  expect(swipeDirection(-60, 0, { width: 390 })).toBe(0);   // umbral 78 px
  expect(swipeDirection(-80, 0, { width: 390 })).toBe(1);
  expect(swipeDirection(100, 0, { width: 1000 })).toBe(0);  // tope de 120 px
  expect(swipeDirection(125, 0, { width: 1000 })).toBe(-1);
  expect(swipeDirection(-50, 0, { width: 200 })).toBe(1);   // mínimo de 48 px
});

it("un gesto rápido (velocidad) encaja aunque el recorrido sea corto, pero no si es casi nulo", () => {
  expect(swipeDirection(-30, 0, { width: 390, velocity: -0.8 })).toBe(1);
  expect(swipeDirection(30, 0, { width: 390, velocity: 0.8 })).toBe(-1);
  expect(swipeDirection(-20, 0, { width: 390, velocity: -2 })).toBe(0);
  expect(swipeDirection(-30, 0, { width: 390, velocity: -0.2 })).toBe(0);
  expect(swipeDirection(-30, 0, { width: 390, velocity: NaN })).toBe(0);
});

it("aunque sea rápido, un gesto sobre todo vertical (scroll) no cambia de foto", () => {
  expect(swipeDirection(-40, 90, { width: 390, velocity: -1.5 })).toBe(0);
});
