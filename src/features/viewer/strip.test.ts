import { expect, it } from "vitest";
import { EDGE_RESISTANCE, canDrag, dragOffset, stripSlides, stripTarget } from "./strip";

it("solo se montan la foto actual y sus vecinas (anterior y siguiente), de forma circular", () => {
  expect(stripSlides(2, 8)).toEqual([{ index: 1, offset: -1 }, { index: 2, offset: 0 }, { index: 3, offset: 1 }]);
  expect(stripSlides(0, 5)).toEqual([{ index: 4, offset: -1 }, { index: 0, offset: 0 }, { index: 1, offset: 1 }]);
  expect(stripSlides(4, 5)).toEqual([{ index: 3, offset: -1 }, { index: 4, offset: 0 }, { index: 0, offset: 1 }]);
  for (const count of [3, 4, 9, 40]) expect(stripSlides(1, count)).toHaveLength(3);
});

it("con dos fotos la otra se coloca a su lado natural y con una sola no hay tira que mover; sin fotos, nada", () => {
  expect(stripSlides(0, 2)).toEqual([{ index: 0, offset: 0 }, { index: 1, offset: 1 }]);
  expect(stripSlides(1, 2)).toEqual([{ index: 1, offset: 0 }, { index: 0, offset: -1 }]);
  expect(stripSlides(0, 1)).toEqual([{ index: 0, offset: 0 }]);
  expect(stripSlides(0, 0)).toEqual([]);
});

it("nunca se monta la misma foto dos veces (cada una pediría su propia descarga)", () => {
  for (const count of [1, 2, 3, 4, 7]) for (let index = 0; index < count; index++) {
    const indices = stripSlides(index, count).map((slide) => slide.index);
    expect(new Set(indices).size).toBe(indices.length);
  }
});

it("la foto destino al ir adelante o atrás es circular", () => {
  expect(stripTarget(0, 5, -1)).toBe(4); expect(stripTarget(4, 5, 1)).toBe(0);
  expect(stripTarget(2, 5, 1)).toBe(3); expect(stripTarget(2, 5, -1)).toBe(1);
  expect(stripTarget(0, 2, -1)).toBe(1); expect(stripTarget(1, 2, 1)).toBe(0);
});

it("se puede arrastrar hacia donde hay foto montada; con dos fotos solo hacia la otra y con una, a ningún lado", () => {
  for (const direction of [1, -1] as const) expect(canDrag(2, 5, direction)).toBe(true);
  expect(canDrag(0, 2, 1)).toBe(true); expect(canDrag(0, 2, -1)).toBe(false);
  expect(canDrag(1, 2, -1)).toBe(true); expect(canDrag(1, 2, 1)).toBe(false);
  for (const direction of [1, -1] as const) expect(canDrag(0, 1, direction)).toBe(false);
});

it("la tira sigue al dedo hasta un ancho; hacia un lado sin foto solo cede un poco (goma)", () => {
  expect(dragOffset(-100, 390, true)).toBe(-100); expect(dragOffset(60, 390, true)).toBe(60);
  expect(dragOffset(-900, 390, true)).toBe(-390); expect(dragOffset(900, 390, true)).toBe(390);
  expect(dragOffset(-100, 390, false)).toBe(-100 * EDGE_RESISTANCE);
  expect(dragOffset(-9000, 390, false)).toBe(-390 * EDGE_RESISTANCE);
  expect(dragOffset(NaN, 390, true)).toBe(0); expect(dragOffset(50, 0, true)).toBe(0);
});
