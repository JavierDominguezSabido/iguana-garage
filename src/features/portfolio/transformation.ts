import type { PublicJob } from "./contract";

export type TransformationSelection = Readonly<{ jobId: string; beforeMediaId: string; afterMediaId: string }>;
export type PublicTransformation = { job: PublicJob; before: PublicJob["media"][number]; after: PublicJob["media"][number] };

// Pareja revisada visualmente: preparación y acabado de pintura del mismo Suzuki.
// Los IDs son públicos. El orden de las fotos no define Antes/Después.
export const FEATURED_TRANSFORMATION: TransformationSelection = {
  jobId: "8f507ad1-9bec-400d-8663-9a516545ffc9",
  beforeMediaId: "504d65a0-39e0-4e22-96d5-ce924d6bf1b6",
  afterMediaId: "48ccc1f5-1f4a-42ca-a11a-1d32ebb8a338",
};

export function selectFeaturedTransformation(jobs: readonly PublicJob[], selection: TransformationSelection = FEATURED_TRANSFORMATION): PublicTransformation | undefined {
  if (selection.beforeMediaId === selection.afterMediaId) return;
  const job = jobs.find(item => item.id === selection.jobId);
  if (!job) return;
  const before = job.media.find(photo => photo.id === selection.beforeMediaId);
  const after = job.media.find(photo => photo.id === selection.afterMediaId);
  // Solo se presenta una pareja completa ya autorizada por el contrato público actual.
  if (!before || !after) return;
  return { job, before, after };
}
