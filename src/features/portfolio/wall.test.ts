import { expect, it } from "vitest";
import { wallLayout, wallRows } from "./wall";

it("reparte las fotos de un trabajo en filas de hasta cuatro sin dejar una foto sola", () => {
  expect(wallRows(0)).toEqual([]);
  expect(wallRows(1)).toEqual([1]);
  expect(wallRows(2)).toEqual([2]);
  expect(wallRows(3)).toEqual([3]);
  expect(wallRows(4)).toEqual([4]);
  expect(wallRows(5)).toEqual([3, 2]);
  expect(wallRows(6)).toEqual([4, 2]);
  expect(wallRows(7)).toEqual([4, 3]);
  expect(wallRows(8)).toEqual([4, 4]);
  expect(wallRows(9)).toEqual([4, 3, 2]);
  expect(wallRows(13)).toEqual([4, 4, 3, 2]);
  for (let count = 2; count <= 40; count++) {
    const rows = wallRows(count);
    expect(rows.reduce((total, row) => total + row, 0)).toBe(count);
    expect(Math.min(...rows)).toBeGreaterThanOrEqual(2);
    expect(Math.max(...rows)).toBeLessThanOrEqual(4);
  }
});

it("cada foto ocupa su parte de 12 columnas en escritorio; una sola foto no se estira", () => {
  expect(wallLayout(4).map((tile) => tile.span)).toEqual([3, 3, 3, 3]);
  expect(wallLayout(3).map((tile) => tile.span)).toEqual([4, 4, 4]);
  expect(wallLayout(2).map((tile) => tile.span)).toEqual([6, 6]);
  expect(wallLayout(5).map((tile) => tile.span)).toEqual([4, 4, 4, 6, 6]);
  expect(wallLayout(1).map((tile) => tile.span)).toEqual([4]);
  expect(wallLayout(0)).toEqual([]);
});

it("en móvil (dos columnas) la primera foto ocupa todo el ancho cuando el número es impar", () => {
  expect(wallLayout(1).map((tile) => tile.wide)).toEqual([true]);
  expect(wallLayout(3).map((tile) => tile.wide)).toEqual([true, false, false]);
  expect(wallLayout(5).map((tile) => tile.wide)).toEqual([true, false, false, false, false]);
  expect(wallLayout(2).every((tile) => !tile.wide)).toBe(true);
  expect(wallLayout(4).every((tile) => !tile.wide)).toBe(true);
});
