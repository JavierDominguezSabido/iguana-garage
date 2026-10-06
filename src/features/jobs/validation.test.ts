import { describe, expect, it } from "vitest";
import { buildOriginalPath, validateJob, validateMediaMetadata, validateImageBytes } from "./validation";

const owner = "11111111-1111-4111-8111-111111111111";
const job = "22222222-2222-4222-8222-222222222222";
const media = "33333333-3333-4333-8333-333333333333";
const path = `${owner}/${job}/${media}.png`;

describe("validación de trabajos", () => {
  it("normaliza texto, conserva la fecha de calendario y deniega publicación implícita", () => {
    expect(validateJob({ name: "  Mercedes  ", job_date: "2024-02-29", paint_code: "  " })).toEqual({
      name: "Mercedes", job_date: "2024-02-29", paint_code: null, is_public: false,
    });
  });
  it("acepta publicación explícita y código opcional", () => {
    expect(validateJob({ name: "Audi", job_date: "2026-10-06", paint_code: " LY7W ", is_public: true }).paint_code).toBe("LY7W");
  });
  it.each([null, [], {}, { name: " ", job_date: "2026-10-06" }, { name: "A".repeat(201), job_date: "2026-10-06" }, { name: "Audi", job_date: "2026-02-29" }, { name: "Audi", job_date: "2026-04-31" }, { name: "Audi", job_date: "2026-10-06T00:00:00Z" }, { name: "Audi", job_date: "2026-10-06", is_public: "true" }, { name: "Audi", job_date: "2026-10-06", paint_code: 42 }])("rechaza entradas inválidas", (input) => {
    expect(() => validateJob(input)).toThrow();
  });
  it("no permite introducir el propietario ni campos editoriales", () => {
    expect(() => validateJob({ name: "Audi", job_date: "2026-10-06", owner_id: owner })).toThrow();
    expect(() => validateJob({ name: "Audi", job_date: "2026-10-06", status: "done" })).toThrow();
  });
});

describe("medios privados", () => {
  const valid = { storage_path: path, mime_type: "image/png", position: 0, width: 1, height: 1, byte_size: 100 };
  it("construye una ruta sin nombres suministrados por usuario", () => {
    expect(buildOriginalPath(owner, job, media, "image/png")).toBe(path);
    expect(() => buildOriginalPath("../other", job, media, "image/png")).toThrow();
    expect(() => buildOriginalPath(owner, job, media, "image/svg+xml")).toThrow();
  });
  it("acepta metadatos positivos y dimensiones opcionales", () => {
    expect(validateMediaMetadata(valid, { ownerId: owner, jobId: job, mediaId: media })).toEqual(valid);
    expect(validateMediaMetadata({ ...valid, width: null, height: null }, { ownerId: owner, jobId: job, mediaId: media }).width).toBeNull();
  });
  it.each([{ position: -1 }, { position: 0.5 }, { width: 0 }, { height: -1 }, { byte_size: 0 }, { byte_size: 10 * 1024 * 1024 + 1 }, { mime_type: "video/mp4" }, { storage_path: "../image.png" }, { storage_path: `${job}/${owner}/${media}.png` }])("rechaza metadatos o ámbitos inválidos", (change) => {
    expect(() => validateMediaMetadata({ ...valid, ...change }, { ownerId: owner, jobId: job, mediaId: media })).toThrow();
  });
  it("comprueba tamaño real y firma de imagen, además de MIME declarado", () => {
    const png = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(() => validateImageBytes(png, "image/png")).not.toThrow();
    expect(() => validateImageBytes(png, "image/jpeg")).toThrow();
    expect(() => validateImageBytes(new TextEncoder().encode("<svg/>"), "image/png")).toThrow();
    expect(() => validateImageBytes(new Uint8Array(), "image/png")).toThrow();
    expect(() => validateImageBytes(new Uint8Array(10 * 1024 * 1024 + 1), "image/png")).toThrow();
  });
});
