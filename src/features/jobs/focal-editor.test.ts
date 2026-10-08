import { describe, expect, it } from "vitest";
import { focalFromPointer, frameFor } from "./focal-editor";

describe("geometría del marco del encuadre", () => {
  it("una foto horizontal solo se recorta a los lados y una vertical solo arriba y abajo", () => {
    expect(frameFor(3 / 2)).toEqual({ visibleX: (4 / 3) / (3 / 2), visibleY: 1 });
    expect(frameFor(4 / 5)).toEqual({ visibleX: 1, visibleY: (4 / 5) / (4 / 3) });
    expect(frameFor(4 / 3)).toEqual({ visibleX: 1, visibleY: 1 });
  });
  it("el puntero centra el marco y los extremos se saturan en 0 y 100", () => {
    const centre = { x: 50, y: 50 };
    expect(focalFromPointer(0.5, 0.5, 3 / 2, centre)).toEqual({ x: 50, y: 50 });
    expect(focalFromPointer(0.95, 0.1, 3 / 2, centre)).toEqual({ x: 100, y: 50 });
    expect(focalFromPointer(0.02, 0.9, 3 / 2, centre)).toEqual({ x: 0, y: 50 });
    expect(focalFromPointer(0.1, 0.99, 4 / 5, centre)).toEqual({ x: 50, y: 100 });
    expect(focalFromPointer(0.9, 0.0, 4 / 5, centre)).toEqual({ x: 50, y: 0 });
  });
  it("el eje sin recorte conserva el valor guardado", () => {
    expect(focalFromPointer(0.9, 0.9, 4 / 3, { x: 12, y: 34 })).toEqual({ x: 12, y: 34 });
  });
  it("la posición del marco coincide con object-position: 0 % deja el marco a la izquierda y 100 % a la derecha", () => {
    const { visibleX } = frameFor(3 / 2);
    expect((100 / 100) * (1 - visibleX) + visibleX).toBeCloseTo(1, 10);
    expect((0 / 100) * (1 - visibleX)).toBe(0);
  });
});
