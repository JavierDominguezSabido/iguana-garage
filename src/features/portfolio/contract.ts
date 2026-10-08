import { isCalendarDate, isUuid } from "@/features/jobs/validation";

export const PUBLIC_DESCRIPTION_MAX = 500;
export type PublicJob = { id: string; name: string; job_date: string; description: string | null; media: { id: string; path: string; focal_x: number; focal_y: number }[] };
export function parsePublicJobs(input: unknown): PublicJob[] {
  const invalid = () => new Error("Contrato público inválido");
  if (!Array.isArray(input)) throw invalid();
  return input.map((row) => {
    if (!row || !isUuid(row.id) || typeof row.name !== "string" || !row.name.trim() || row.name.length > 200 || !isCalendarDate(row.job_date) || !Array.isArray(row.media)) throw invalid();
    // Única novedad pública: texto plano opcional. Las horas de trabajo nunca viajan en este contrato.
    if (row.description != null && (typeof row.description !== "string" || !row.description.trim() || row.description.length > PUBLIC_DESCRIPTION_MAX)) throw invalid();
    const media = row.media.map((item: unknown) => {
      if (!item || typeof item !== "object" || !("id" in item) || !("path" in item) || !isUuid(item.id) || item.path !== `${row.id}/${item.id}.webp`) throw invalid();
      // Punto focal (% 0–100) solo para fotos publicadas; ausente = centro (compatibilidad con respuestas anteriores).
      const focal = (value: unknown) => { if (value == null) return 50; if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) throw invalid(); return value; };
      const raw = item as { focal_x?: unknown; focal_y?: unknown };
      return { id: item.id, path: item.path as string, focal_x: focal(raw.focal_x), focal_y: focal(raw.focal_y) };
    });
    // Proyección explícita: no propagar campos adicionales devueltos por el servidor.
    return { id: row.id, name: row.name, job_date: row.job_date, description: row.description ?? null, media };
  });
}
