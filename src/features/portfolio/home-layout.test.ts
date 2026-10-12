import { describe, expect, it } from "vitest";
import type { PublicJob } from "./contract";
import { fanCards, fanSlot, mosaicColumns, mosaicRatio } from "./home-layout";

const id = (n: number, k = 0) => `${String(n).repeat(8)}-${String(k).repeat(4)}-4111-8111-111111111111`;
const job = (n: number, photos: number): PublicJob => ({ id: id(n), name: `Trabajo ${n}`, job_date: "2026-01-15", description: null,
  media: Array.from({ length: photos }, (_, k) => ({ id: id(n, k + 1), path: `${id(n)}/${id(n, k + 1)}.webp`, focal_x: 50, focal_y: 50 })) });

describe("abanico de la portada", () => {
  it("toma primero una foto de cada trabajo, en el orden del muro, y marca esas cartas como principales", () => {
    const cards = fanCards([job(1, 3), job(2, 1), job(3, 2)], 7);
    expect(cards.map(c => [c.job.name, c.photo.id === c.job.media[0].id, c.primary])).toEqual([
      ["Trabajo 1", true, true], ["Trabajo 2", true, true], ["Trabajo 3", true, true],
      ["Trabajo 1", false, false], ["Trabajo 3", false, false], ["Trabajo 1", false, false],
    ]);
  });
  it("no pasa del máximo y sin fotos no hay cartas", () => {
    expect(fanCards([job(1, 5), job(2, 5)], 7)).toHaveLength(7);
    expect(fanCards([job(1, 9)], 3)).toHaveLength(3);
    expect(fanCards([], 7)).toEqual([]);
    expect(fanCards([job(1, 0)], 7)).toEqual([]);
  });
  it("reparte las cartas de -0,5 (izquierda) a 0,5 (derecha); una sola queda centrada", () => {
    expect([0, 1, 2].map(i => fanSlot(i, 3))).toEqual([-0.5, 0, 0.5]);
    expect(fanSlot(0, 1)).toBe(0);
  });
});

describe("mosaico de cada trabajo", () => {
  it("dos columnas escalonadas que conservan el índice del muro; una sola foto, una columna", () => {
    expect(mosaicColumns(["a", "b", "c", "d", "e"]).map(col => col.map(c => `${c.item}${c.index}`))).toEqual([["a0", "c2", "e4"], ["b1", "d3"]]);
    expect(mosaicColumns(["a"]).map(col => col.map(c => c.item))).toEqual([["a"]]);
    expect(mosaicColumns([])).toEqual([[]]);
  });
  it("alterna proporciones para que los recuadros tengan distintos tamaños", () => {
    expect([0, 1, 2, 3, 4, 5].map(mosaicRatio)).toEqual(["4 / 5", "1 / 1", "3 / 5", "3 / 4", "4 / 5", "4 / 5"]);
  });
});
