import { describe, expect, it } from "vitest";
import { dropIndex, edgeScrollSpeed, keyboardTarget, moveItem, movedBeyond } from "./reorder";
import { sortByWall } from "./portada-order";

describe("mover elementos", () => {
  it("mueve hacia la derecha, hacia la izquierda y no muta la lista", () => {
    const items = ["a", "b", "c", "d"];
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(items, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(items, 1, 2)).toEqual(["a", "c", "b", "d"]);
    expect(items).toEqual(["a", "b", "c", "d"]);
  });
  it("sin cambio o fuera de rango devuelve una copia igual", () => {
    const items = ["a", "b"];
    for (const [from, to] of [[0, 0], [-1, 1], [0, 2], [2, 0]]) { const result = moveItem(items, from, to); expect(result).toEqual(items); expect(result).not.toBe(items); }
  });
});

describe("posición de soltado según el puntero", () => {
  const centers = [50, 150, 250, 350];
  it("cuenta las demás piezas a la izquierda del puntero", () => {
    expect(dropIndex(centers, 0, 1)).toBe(0);
    expect(dropIndex(centers, 140, 1)).toBe(1);
    expect(dropIndex(centers, 300, 0)).toBe(2);
    expect(dropIndex(centers, 999, 0)).toBe(3);
    expect(dropIndex(centers, 999, 3)).toBe(3);
  });
  it("soltar sobre la propia pieza no cambia nada", () => {
    centers.forEach((center, from) => expect(dropIndex(centers, center, from)).toBe(from));
  });
  it("coincide con moveItem: la pieza acaba en el índice calculado", () => {
    const ids = ["a", "b", "c", "d"];
    expect(moveItem(ids, 0, dropIndex(centers, 260, 0))[2]).toBe("a");
  });
});

describe("desplazamiento automático en los bordes", () => {
  it("0 en el centro, negativo a la izquierda y positivo a la derecha, con tope", () => {
    expect(edgeScrollSpeed(200, 0, 400)).toBe(0);
    expect(edgeScrollSpeed(10, 0, 400)).toBeLessThan(0);
    expect(edgeScrollSpeed(390, 0, 400)).toBeGreaterThan(0);
    expect(Math.abs(edgeScrollSpeed(-500, 0, 400))).toBe(14);
    expect(edgeScrollSpeed(47, 0, 400)).toBe(-1);
  });
});

describe("teclado y táctil", () => {
  it("Mayús + flechas mueven dentro de los límites; sin Mayús o en el extremo no hacen nada", () => {
    expect(keyboardTarget("ArrowRight", true, 1, 4)).toBe(2);
    expect(keyboardTarget("ArrowLeft", true, 1, 4)).toBe(0);
    expect(keyboardTarget("ArrowLeft", true, 0, 4)).toBeNull();
    expect(keyboardTarget("ArrowRight", true, 3, 4)).toBeNull();
    expect(keyboardTarget("ArrowRight", false, 1, 4)).toBeNull();
    expect(keyboardTarget("Enter", true, 1, 4)).toBeNull();
  });
  it("un desplazamiento mayor que el umbral cancela la pulsación larga", () => {
    expect(movedBeyond(3, 4, 10)).toBe(false);
    expect(movedBeyond(8, 8, 10)).toBe(true);
  });
});

describe("orden de los trabajos del muro", () => {
  const job = (id: string, job_date: string, is_public: boolean, wall_position: number | null) => ({ id, job_date, is_public, wall_position });
  it("los publicados siguen su posición manual y los empates, fecha descendente y UUID; los privados van al final por fecha", () => {
    const jobs = [job("c", "2026-01-01", true, 2), job("p2", "2026-05-01", false, null), job("a", "2026-03-01", true, 0), job("b", "2026-09-01", true, 1), job("p1", "2026-06-01", false, null), job("d", "2026-02-01", true, 2)];
    expect(sortByWall(jobs).map((item) => item.id)).toEqual(["a", "b", "d", "c", "p1", "p2"]);
  });
  it("una posición negativa (entra arriba) va antes que las demás y un publicado sin posición, al final de los publicados", () => {
    const jobs = [job("a", "2026-03-01", true, 0), job("n", "2026-01-01", true, -1), job("z", "2026-12-01", true, null)];
    expect(sortByWall(jobs).map((item) => item.id)).toEqual(["n", "a", "z"]);
  });
  it("no muta la lista de entrada", () => {
    const jobs = [job("b", "2026-01-01", true, 1), job("a", "2026-01-01", true, 0)];
    sortByWall(jobs);
    expect(jobs.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
