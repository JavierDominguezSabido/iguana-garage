import { describe, expect, it } from "vitest";
import { buildOriginalPath, parseWorkHours, validateFocalPoint, validateJob, validateMediaMetadata, validateImageBytes } from "./validation";

const owner = "11111111-1111-4111-8111-111111111111";
const job = "22222222-2222-4222-8222-222222222222";
const media = "33333333-3333-4333-8333-333333333333";
const path = `${owner}/${job}/${media}.png`;

describe("validación de trabajos", () => {
  it("normaliza texto, conserva la fecha de calendario y deniega publicación implícita", () => {
    expect(validateJob({ name: "  Mercedes  ", job_date: "2024-02-29", paint_code: "  " })).toEqual({
      name: "Mercedes", job_date: "2024-02-29", paint_code: null, work_hours: null, description: null, is_public: false,
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

describe("horas de trabajo y descripción", () => {
  const base = { name: "Audi", job_date: "2026-10-06" };
  it("son opcionales: sin ellos o vacíos el trabajo sigue siendo válido", () => {
    expect(validateJob(base)).toMatchObject({ work_hours: null, description: null });
    expect(validateJob({ ...base, work_hours: null, description: "   " })).toMatchObject({ work_hours: null, description: null });
  });
  it("acepta horas exactas con hasta dos decimales y descripción en texto plano recortada", () => {
    expect(validateJob({ ...base, work_hours: 12.5, description: "  Reparación de paragolpes trasero y pintura.  " })).toMatchObject({ work_hours: 12.5, description: "Reparación de paragolpes trasero y pintura." });
    expect(validateJob({ ...base, work_hours: 0 }).work_hours).toBe(0);
    expect(validateJob({ ...base, work_hours: 999.99 }).work_hours).toBe(999.99);
    expect(validateJob({ ...base, work_hours: 0.07 }).work_hours).toBe(0.07);
    expect(validateJob({ ...base, description: "Línea 1\r\nLínea 2" }).description).toBe("Línea 1\nLínea 2");
    expect(validateJob({ ...base, description: "x".repeat(500) }).description).toHaveLength(500);
  });
  it.each([-1, -0.01, 1000, 12.345, Number.NaN, Number.POSITIVE_INFINITY, "12", true])("rechaza horas inválidas %s", (work_hours) => {
    expect(() => validateJob({ ...base, work_hours })).toThrow();
  });
  it.each([42, true, "x".repeat(501), "con\u0000nulo", "con\u001bescape"])("rechaza descripciones inválidas", (description) => {
    expect(() => validateJob({ ...base, description })).toThrow();
  });
  it("interpreta el texto del formulario con coma o punto y rechaza formatos ambiguos", () => {
    expect(parseWorkHours("12,5")).toBe(12.5);
    expect(parseWorkHours(" 8 ")).toBe(8);
    expect(parseWorkHours("0.25")).toBe(0.25);
    expect(parseWorkHours("")).toBeNull();
    for (const text of ["-1", "1,234", "1.000,5", "abc", "12 h", "1e2", "1000", ",5"]) expect(() => parseWorkHours(text)).toThrow();
  });
});

describe("punto focal", () => {
  it("acepta enteros 0–100 incluidos los extremos y el centro", () => {
    expect(validateFocalPoint({ focal_x: 50, focal_y: 50 })).toEqual({ focal_x: 50, focal_y: 50 });
    expect(validateFocalPoint({ focal_x: 0, focal_y: 100 })).toEqual({ focal_x: 0, focal_y: 100 });
  });
  it.each([{ focal_x: -1, focal_y: 0 }, { focal_x: 0, focal_y: 101 }, { focal_x: 0.5, focal_y: 0 }, { focal_x: "5", focal_y: 0 }, { focal_x: Number.NaN, focal_y: 0 }, { focal_x: 1 }, { focal_x: 1, focal_y: 1, owner_id: "x" }, null, []])("rechaza %j", (input) => {
    expect(() => validateFocalPoint(input)).toThrow();
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
