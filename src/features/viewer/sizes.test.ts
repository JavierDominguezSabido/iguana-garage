import { expect, it } from "vitest";
import { VIEWER_ARROWS_PX, VIEWER_CHROME_PX, viewerStageSizes } from "./sizes";

it("el visor a pantalla completa pide la resolución que contain realmente pinta, con flechas laterales en escritorio", () => {
  expect(VIEWER_CHROME_PX).toBe(148); expect(VIEWER_ARROWS_PX).toBe(176);
  expect(viewerStageSizes(0.75)).toBe("(min-width: 900px) min(calc(100vw - 176px), calc((100dvh - 148px) * 0.75)), min(100vw, calc((100dvh - 148px) * 0.75))");
  expect(viewerStageSizes(16 / 9)).toBe("(min-width: 900px) min(calc(100vw - 176px), calc((100dvh - 148px) * 1.7778)), min(100vw, calc((100dvh - 148px) * 1.7778))");
});

it("sin proporción conocida usa el ancho real del marco, nunca una suposición vertical", () => {
  for (const ratio of [undefined, 0, -1, NaN, Infinity]) expect(viewerStageSizes(ratio)).toBe("(min-width: 900px) calc(100vw - 176px), 100vw");
});
