import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { photoRequest, publicPhotoUrl, portfolioPage, portfolioHero } from "./delivery";
import type { PublicJob } from "./contract";
import { resizePublicPhoto } from "./image-processing";

const job = "22222222-2222-4222-8222-222222222222";
const media = "33333333-3333-4333-8333-333333333333";
describe("entrega de derivados autorizados", () => {
  it("construye únicamente una ruta de derivado y una variante permitida", () => {
    expect(publicPhotoUrl(job, media, 390)).toBe(`/api/portfolio/photos/${job}/${media}?w=390&r=0`);
    expect(photoRequest(job, media, new URL(`https://site.example/photo?w=390&r=0`))).toEqual({ path: `${job}/${media}.webp`, width: 390 });
  });
  it.each(["../original", "https://evil.example", "a/b", "not-a-uuid"])("rechaza rutas arbitrarias", (id) => {
    expect(() => publicPhotoUrl(id, media, 390)).toThrow();
  });
  it.each(["w=999", "w=0", "w=1601", "w=390&w=640", "w=390&original=1", "w=390&r=-1", "w=390&r=999"])("rechaza transformaciones/inputs sin límite", (query) => {
    expect(() => photoRequest(job, media, new URL(`https://site.example/photo?${query}`))).toThrow();
  });
  it.each([[300, 400], [400, 300], [1600, 400], [400, 1600], [400, 400]])("preserva proporción %i×%i sin crop ni upscale", async (width, height) => {
    const source = await sharp({ create: { width, height, channels: 3, background: "#343b35" } }).webp().toBuffer();
    const result = await resizePublicPhoto(source, 640);
    const output = await sharp(result).metadata();
    expect(output.format).toBe("webp");
    expect(output.width! / output.height!).toBeCloseTo(width / height, 2);
    expect(output.width).toBeLessThanOrEqual(width);
    expect(output.height).toBeLessThanOrEqual(height);
    expect(output.exif).toBeUndefined();
  });
  it("rechaza bytes ajenos a un WebP público válido", async () => {
    await expect(resizePublicPhoto(Buffer.from("invalid"), 640)).rejects.toThrow();
  });
});
describe("paginación pública acotada", () => {
  it.each([undefined, "", "bad", "-1", "0", "1.5", "9999999"])("normaliza navegación inválida al inicio", (input) => expect(portfolioPage(input)).toBe(1));
  it("permite llegar a trabajos anteriores sin ampliar el contrato", () => expect(portfolioPage("2")).toBe(2));
});

describe("hero sin repetición inmediata del primer trabajo", () => {
  const work = (id: string, photos = 1): PublicJob => ({ id, name: id, job_date: "2026-10-06", description: null, media: Array.from({ length: photos }, (_, index) => ({ id: `${id}-${index}`, path: `${id}/${index}.webp`, focal_x: 50, focal_y: 50 })) });
  it("elige otro trabajo de la página y conserva el orden y las fotografías del listado", () => {
    const jobs = [work("primero"), work("segundo"), work("tercero")];
    const original = structuredClone(jobs);
    expect(portfolioHero(jobs)?.id).toBe("tercero");
    expect(jobs).toEqual(original);
  });
  it("salta trabajos sin fotos al buscar una alternativa al primero", () => {
    const alternative = work("segundo");
    expect(portfolioHero([work("primero"), alternative, work("sin-fotos", 0)])).toBe(alternative);
  });
  it("admite una alternativa aunque el primer trabajo no tenga fotos", () => {
    const alternative = work("segundo");
    expect(portfolioHero([work("primero", 0), alternative])).toBe(alternative);
  });
  it.each([[], [work("único")], [work("único", 3)], [work("primero"), work("sin-fotos", 0)], [work("sin-fotos", 0)]])("deja el hero a la identidad oficial si no hay otro trabajo con fotos", (...jobs: PublicJob[]) => {
    expect(portfolioHero(jobs)).toBeUndefined();
  });
});
