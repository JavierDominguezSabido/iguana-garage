import { isCalendarDate, isUuid } from "@/features/jobs/validation";

export type PublicJob = { id: string; name: string; job_date: string; media: { id: string; path: string }[] };
export function parsePublicJobs(input: unknown): PublicJob[] {
  const invalid = () => new Error("Contrato público inválido");
  if (!Array.isArray(input)) throw invalid();
  return input.map((row) => {
    if (!row || !isUuid(row.id) || typeof row.name !== "string" || !row.name.trim() || row.name.length > 200 || !isCalendarDate(row.job_date) || !Array.isArray(row.media)) throw invalid();
    const media = row.media.map((item: unknown) => {
      if (!item || typeof item !== "object" || !("id" in item) || !("path" in item) || !isUuid(item.id) || item.path !== `${row.id}/${item.id}.webp`) throw invalid();
      return { id: item.id, path: item.path as string };
    });
    // Proyección explícita: no propagar campos adicionales devueltos por el servidor.
    return { id: row.id, name: row.name, job_date: row.job_date, media };
  });
}
