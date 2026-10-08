import { describe, expect, it } from "vitest";
import type { PublicJob } from "./contract";
import { selectFeaturedTransformation, type TransformationSelection } from "./transformation";

const selection: TransformationSelection = {
  jobId: "11111111-1111-4111-8111-111111111111",
  beforeMediaId: "22222222-2222-4222-8222-222222222222",
  afterMediaId: "33333333-3333-4333-8333-333333333333",
};
const otherId = "44444444-4444-4444-8444-444444444444";
const media = (id: string, jobId = selection.jobId) => ({ id, path: `${jobId}/${id}.webp`, focal_x: 50, focal_y: 50 });
const job = (photos = [media(selection.beforeMediaId), media(selection.afterMediaId)]): PublicJob => ({ id: selection.jobId, name: "Trabajo curado", job_date: "2026-10-06", description: null, media: photos });

describe("selección explícita de una transformación pública", () => {
  it("selecciona los IDs curados aunque cambien nombre, orden y fotografías adicionales", () => {
    const selected = job([media(selection.afterMediaId), media(otherId), media(selection.beforeMediaId)]);
    selected.name = "Nombre actualizado";
    expect(selectFeaturedTransformation([selected], selection)).toEqual({ job: selected, before: media(selection.beforeMediaId), after: media(selection.afterMediaId) });
  });
  it("oculta la sección cuando el trabajo deja de estar en el contrato público", () => {
    expect(selectFeaturedTransformation([], selection)).toBeUndefined();
    expect(selectFeaturedTransformation([{ ...job(), id: otherId }], selection)).toBeUndefined();
  });
  it.each([selection.beforeMediaId, selection.afterMediaId])("oculta toda la comparación si desaparece %s", id => {
    expect(selectFeaturedTransformation([job(job().media.filter(photo => photo.id !== id))], selection)).toBeUndefined();
  });
  it("no toma fotos de otro trabajo ni deduce momentos de posiciones", () => {
    const unrelated = { ...job(), id: otherId, media: [media(selection.beforeMediaId, otherId), media(selection.afterMediaId, otherId)] };
    expect(selectFeaturedTransformation([job([media(otherId)]), unrelated], selection)).toBeUndefined();
  });
  it("no presenta una misma fotografía como dos momentos diferentes", () => {
    expect(selectFeaturedTransformation([job()], { ...selection, afterMediaId: selection.beforeMediaId })).toBeUndefined();
  });
});
