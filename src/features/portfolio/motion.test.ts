import { describe, expect, it } from "vitest";
import { crossing, follow, passProgress, pinnedProgress, revealProgress } from "./motion";

describe("progreso ligado al scroll", () => {
  it("sección fija: 0 al llegar arriba, 1 al acabar su recorrido extra y acotado fuera", () => {
    expect(pinnedProgress(0, 2000, 800)).toBe(0);
    expect(pinnedProgress(-600, 2000, 800)).toBe(0.5);
    expect(pinnedProgress(-1200, 2000, 800)).toBe(1);
    expect(pinnedProgress(300, 2000, 800)).toBe(0);
    expect(pinnedProgress(-5000, 2000, 800)).toBe(1);
    expect(pinnedProgress(0, 800, 800)).toBe(0); // sin recorrido extra no divide por cero
  });
  it("Antes/Después: el Antes se queda quieto, cruza suave y el Después se queda quieto", () => {
    expect(crossing(0)).toBe(0); expect(crossing(0.2)).toBe(0);
    expect(crossing(0.5)).toBeCloseTo(0.5);
    expect(crossing(0.8)).toBe(1); expect(crossing(1)).toBe(1);
    expect(crossing(0.3)).toBeLessThan(0.05); // arranca despacio
    expect(crossing(Number.NaN)).toBe(0);
  });
  it("destapado: empieza al asomar por abajo y termina antes de llegar arriba", () => {
    expect(revealProgress(800, 800)).toBe(0);
    expect(revealProgress(800 - 180, 800)).toBeCloseTo(0.5);
    expect(revealProgress(0, 800)).toBe(1);
    expect(revealProgress(2000, 800)).toBe(0);
  });
  it("paso de un bloque por la pantalla: de 0 al asomar a 1 al salir por arriba", () => {
    expect(passProgress(800, 400, 800)).toBe(0);
    expect(passProgress(200, 400, 800)).toBe(0.5);
    expect(passProgress(-400, 400, 800)).toBe(1);
  });
  it("inercia: se acerca una fracción cada fotograma y al final llega exacto", () => {
    expect(follow(0, 1, 0.25)).toBe(0.25);
    expect(follow(0.99995, 1)).toBe(1);
    expect(follow(1, 1)).toBe(1);
  });
});
