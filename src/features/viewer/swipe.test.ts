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
