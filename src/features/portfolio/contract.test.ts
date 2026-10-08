import { describe, expect, it } from "vitest";
import { parsePublicJobs } from "./contract";

const jobId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";
const row = { id: jobId, name: "Audi", job_date: "2026-10-06", description: null, media: [{ id: mediaId, path: `${jobId}/${mediaId}.webp` }] };

describe("contrato público", () => {
  it("conserva únicamente campos expresamente públicos, incluso ante cambios del RPC", () => {
    expect(parsePublicJobs([{ ...row, owner_id: "private", paint_code: "private", work_hours: 12.5, created_at: "private", media: [{ ...row.media[0], storage_path: "private", byte_size: 100 }] }])).toEqual([row]);
    expect(JSON.stringify(parsePublicJobs([row]))).not.toContain("paint_code");
  });
  it("propaga solo la descripción y jamás las horas de trabajo", () => {
    const parsed = parsePublicJobs([{ ...row, description: "Preparación de aleta, reparación y acabado.", work_hours: 12.5, work_hours_total: 3 }]);
    expect(parsed[0].description).toBe("Preparación de aleta, reparación y acabado.");
    expect(Object.keys(parsed[0]).sort()).toEqual(["description", "id", "job_date", "media", "name"]);
    expect(JSON.stringify(parsed)).not.toMatch(/work_hours|12[.]5/);
  });
  it("trata la descripción ausente o nula como sin descripción", () => {
    const { description: _omit, ...withoutDescription } = row;
    void _omit;
    expect(parsePublicJobs([withoutDescription])[0].description).toBeNull();
    expect(parsePublicJobs([{ ...row, description: null }])[0].description).toBeNull();
  });
  it.each([" ", "x".repeat(501), 42, {}])("rechaza una descripción pública inválida", (description) => {
    expect(() => parsePublicJobs([{ ...row, description }])).toThrow(/^Contrato público inválido$/);
  });
  it("admite trabajos sin derivados preparados y una respuesta vacía", () => {
    expect(parsePublicJobs([{ ...row, media: [] }])[0].media).toEqual([]);
    expect(parsePublicJobs([])).toEqual([]);
  });
  it.each([null, {}, [{ ...row, id: "bad" }], [{ ...row, job_date: "bad" }], [{ ...row, media: [{ id: mediaId, path: "https://private.example/image" }] }], [{ ...row, media: [{ id: mediaId, path: `${mediaId}/${jobId}.webp` }] }]])("rechaza un contrato inválido sin exponer la respuesta", (input) => {
    expect(() => parsePublicJobs(input)).toThrow(/^Contrato público inválido$/);
  });
});
