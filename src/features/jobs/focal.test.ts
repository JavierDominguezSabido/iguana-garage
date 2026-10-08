import { expect, it } from "vitest";
import { focalObjectPosition, focalStyle } from "./focal";

it("el encuadre guardado se traduce a object-position en porcentajes", () => {
  expect(focalObjectPosition({ focal_x: 20, focal_y: 80 })).toBe("20% 80%");
  expect(focalObjectPosition({ focal_x: 0, focal_y: 100 })).toBe("0% 100%");
  expect(focalStyle({ focal_x: 35, focal_y: 12 })).toEqual({ objectPosition: "35% 12%" });
});

it("sin valor guardado (o valores no válidos) el recorte se centra, como en lo público", () => {
  expect(focalObjectPosition(undefined)).toBe("50% 50%");
  expect(focalObjectPosition(null)).toBe("50% 50%");
  expect(focalObjectPosition({})).toBe("50% 50%");
  expect(focalObjectPosition({ focal_x: null, focal_y: undefined })).toBe("50% 50%");
  expect(focalObjectPosition({ focal_x: NaN, focal_y: Infinity })).toBe("50% 50%");
  expect(focalObjectPosition({ focal_x: 30 })).toBe("30% 50%");
});

it("los valores fuera de 0–100 se acotan en lugar de desplazar la foto fuera del marco", () => {
  expect(focalObjectPosition({ focal_x: -10, focal_y: 250 })).toBe("0% 100%");
});
