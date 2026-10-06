import { describe, expect, it } from "vitest";
import { parsePublicJobs } from "./contract";

const jobId = "22222222-2222-4222-8222-222222222222";
const mediaId = "33333333-3333-4333-8333-333333333333";
const row = { id: jobId, name: "Audi", job_date: "2026-10-06", media: [{ id: mediaId, path: `${jobId}/${mediaId}.webp` }] };

describe("contrato público", () => {
  it("conserva únicamente campos expresamente públicos, incluso ante cambios del RPC", () => {
    expect(parsePublicJobs([{ ...row, owner_id: "private", paint_code: "private", created_at: "private", media: [{ ...row.media[0], storage_path: "private", byte_size: 100 }] }])).toEqual([row]);
    expect(JSON.stringify(parsePublicJobs([row]))).not.toContain("paint_code");
  });
  it("admite trabajos sin derivados preparados y una respuesta vacía", () => {
    expect(parsePublicJobs([{ ...row, media: [] }])[0].media).toEqual([]);
    expect(parsePublicJobs([])).toEqual([]);
  });
  it.each([null, {}, [{ ...row, id: "bad" }], [{ ...row, job_date: "bad" }], [{ ...row, media: [{ id: mediaId, path: "https://private.example/image" }] }], [{ ...row, media: [{ id: mediaId, path: `${mediaId}/${jobId}.webp` }] }]])("rechaza un contrato inválido sin exponer la respuesta", (input) => {
    expect(() => parsePublicJobs(input)).toThrow(/^Contrato público inválido$/);
  });
});
