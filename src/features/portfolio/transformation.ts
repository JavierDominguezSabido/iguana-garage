import { isUuid } from "@/features/jobs/validation";
import { parsePublicJobs } from "./contract";
import type { PublicJob } from "./contract";

export type TransformationSelection = Readonly<{ jobId: string; beforeMediaId: string; afterMediaId: string }>;
export type PublicTransformation = { job: PublicJob; before: PublicJob["media"][number]; after: PublicJob["media"][number] };

// La pareja la elige el propietario desde /app; el orden de las fotos no define Antes/Después.
export function selectFeaturedTransformation(jobs: readonly PublicJob[], selection: TransformationSelection): PublicTransformation | undefined {
  if (selection.beforeMediaId === selection.afterMediaId) return;
  const job = jobs.find(item => item.id === selection.jobId);
  if (!job) return;
  const before = job.media.find(photo => photo.id === selection.beforeMediaId);
  const after = job.media.find(photo => photo.id === selection.afterMediaId);
  // Solo se presenta una pareja completa ya autorizada por el contrato público actual.
  if (!before || !after) return;
  return { job, before, after };
}

// Respuesta del RPC get_featured_transformation: ninguna fila (portada solo con título) o una con el trabajo y los dos IDs.
// Proyección explícita y revalidación: el trabajo y ambas fotos deben seguir en el contrato público.
export function parseFeaturedTransformation(input: unknown): PublicTransformation | undefined {
  const invalid = () => new Error("Contrato público inválido");
  if (!Array.isArray(input) || input.length > 1) throw invalid();
  if (!input.length) return;
  const row = input[0] as Record<string, unknown> | null;
  if (!row || !isUuid(row.before_id) || !isUuid(row.after_id)) throw invalid();
  const [job] = parsePublicJobs([row]);
  return selectFeaturedTransformation([job], { jobId: job.id, beforeMediaId: row.before_id, afterMediaId: row.after_id });
}
