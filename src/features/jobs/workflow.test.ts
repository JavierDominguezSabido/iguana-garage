import { describe, expect, it, vi } from "vitest";
import { removeMediaSafely, saveDraft } from "./workflow";
import type { SaveDraft, SaveTransport } from "./workflow";

const draft = (): SaveDraft => ({ id: "job", exists: false, job: { name: "Coche", job_date: "2026-10-06", paint_code: null, is_public: true }, photos: [{ id: "one", url: "blob:test", saved: false }, { id: "two", url: "blob:test2", saved: false }], removed: ["old"] });
const transport = (): SaveTransport => ({ prepare: vi.fn(async () => {}), remove: vi.fn(async () => {}), upload: vi.fn(async () => {}), finish: vi.fn(async () => {}) });
describe("guardado recuperable de un trabajo", () => {
  it("prepara, elimina, sube y solo entonces publica", async () => {
    const io = transport(); const order: string[] = [];
    io.prepare = async () => { order.push("prepare"); }; io.remove = async () => { order.push("remove"); };
    io.upload = async (_, photo) => { order.push(photo.id); }; io.finish = async () => { order.push("finish"); };
    const result = await saveDraft(draft(), io, () => {});
    expect(order).toEqual(["prepare", "remove", "one", "two", "finish"]);
    expect(result.exists).toBe(true); expect(result.removed).toEqual([]); expect(result.photos.every((photo) => photo.saved)).toBe(true);
  });
  it("un fallo no comunica éxito y conserva progreso para reanudar sin duplicar", async () => {
    const io = transport(); let checkpoint = draft();
    io.upload = vi.fn(async (_, photo) => { if (photo.id === "two") throw new Error("upload failed"); });
    await expect(saveDraft(checkpoint, io, (next) => { checkpoint = next; })).rejects.toThrow("upload failed");
    expect(checkpoint.exists).toBe(true); expect(checkpoint.photos[0].saved).toBe(true); expect(checkpoint.photos[1].saved).toBe(false);
    expect(io.finish).not.toHaveBeenCalled();
    const retry = transport(); await saveDraft(checkpoint, retry, () => {});
    expect(retry.upload).toHaveBeenCalledTimes(1); expect(retry.remove).not.toHaveBeenCalled();
  });
  it("si falla la preparación no confirma que un trabajo existente haya quedado privado", async () => {
    const io = transport(); let checkpoint = { ...draft(), exists: true, prepared: true };
    io.prepare = async () => { throw new Error("network unavailable"); };
    await expect(saveDraft(checkpoint, io, (next) => { checkpoint = next as typeof checkpoint; })).rejects.toThrow("network unavailable");
    expect(checkpoint.prepared).toBe(false); expect(io.finish).not.toHaveBeenCalled();
  });
});
describe("limpieza antes de borrar metadatos", () => {
  it("conserva los metadatos si falla cualquiera de los buckets", async () => {
    for (const failed of ["derivative", "original"] as const) {
      const steps = { derivative: vi.fn(async () => {}), original: vi.fn(async () => {}), metadata: vi.fn(async () => {}) };
      steps[failed].mockRejectedValueOnce(new Error("storage unavailable"));
      await expect(removeMediaSafely(steps)).rejects.toThrow("storage unavailable");
      expect(steps.metadata).not.toHaveBeenCalled();
    }
  });
  it("elimina ambas copias antes de la referencia", async () => {
    const calls: string[] = [];
    await removeMediaSafely({ derivative: async () => { calls.push("derived"); }, original: async () => { calls.push("original"); }, metadata: async () => { calls.push("metadata"); } });
    expect(calls).toEqual(["derived", "original", "metadata"]);
  });
});
