import { expect, it } from "vitest";
import { PUBLIC_IMAGE_WIDTHS, publicPhotoUrl } from "./delivery";
import { publicImageUrl } from "./image-loader";

const job = "11111111-1111-4111-8111-111111111111";
const media = "22222222-2222-4222-8222-222222222222";

it("conserva exactamente las URLs de las variantes configuradas y los reintentos", () => {
  for (const width of PUBLIC_IMAGE_WIDTHS) expect(publicImageUrl(job, media, width, 1)).toBe(publicPhotoUrl(job, media, width, 1));
});
it("adapta la sonda de 400px sin ampliar lo que admite el endpoint", () => {
  expect(publicImageUrl(job, media, 400)).toBe(publicPhotoUrl(job, media, 640));
  expect(() => publicPhotoUrl(job, media, 400)).toThrow();
});
it("mantiene el rechazo de anchuras inválidas", () => {
  for (const width of [0, -1, 1.5, NaN, Infinity]) expect(() => publicImageUrl(job, media, width)).toThrow();
});
