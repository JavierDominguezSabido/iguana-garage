import "server-only";
import { finishJob, JobError, jobMedia, ownedJob } from "./data";
import type { Client, Job, Media } from "./data";
import { isUuid } from "./validation";
import type { FeaturedSelection, PortfolioPatch } from "./validation";
import type { Database } from "@/lib/supabase/database.types";

export type PortfolioSettings = Database["public"]["Tables"]["portfolio_settings"]["Row"];
type SettingsUpdate = Database["public"]["Tables"]["portfolio_settings"]["Update"];

// Estado de portada de un trabajo, listo para la ficha privada. «other*» nombra lo que se sustituiría al elegir este trabajo.
export type CurationState = {
  pinned: boolean;
  otherPinnedName: string | null;
  featured: { beforeId: string | null; afterId: string | null } | null;
  otherFeaturedName: string | null;
};

export async function portfolioSettings(db: Client, owner: string): Promise<PortfolioSettings | null> {
  const result = await db.from("portfolio_settings").select("*").eq("owner_id", owner).maybeSingle();
  if (result.error) throw new JobError("No se pudo cargar la portada. Reintenta.", 503);
  return result.data;
}
async function saveSettings(db: Client, owner: string, patch: SettingsUpdate) {
  if (await portfolioSettings(db, owner)) {
    const updated = await db.from("portfolio_settings").update(patch).eq("owner_id", owner).select("owner_id");
    if (updated.error || updated.data?.length !== 1) throw new JobError("No se pudo guardar la portada. Reintenta.", 503);
    return;
  }
  const inserted = await db.from("portfolio_settings").insert({ ...patch, owner_id: owner });
  if (inserted.error) throw new JobError("No se pudo guardar la portada. Reintenta.", 503);
}
async function publishedJob(db: Client, owner: string, jobId: string, message: string) {
  const job = await ownedJob(db, owner, jobId);
  if (!job.is_public) throw new JobError(message, 409);
  return job;
}

export async function setPinnedJob(db: Client, owner: string, jobId: string | null) {
  if (jobId === null) {
    if ((await portfolioSettings(db, owner))?.pinned_job_id) await saveSettings(db, owner, { pinned_job_id: null });
    return;
  }
  await publishedJob(db, owner, jobId, "Publica el trabajo antes de fijarlo arriba.");
  await saveSettings(db, owner, { pinned_job_id: jobId });
}

export async function setFeaturedTransformation(db: Client, owner: string, selection: FeaturedSelection | null) {
  if (selection === null) {
    const current = await portfolioSettings(db, owner);
    if (current?.featured_job_id || current?.featured_before_id || current?.featured_after_id) {
      await saveSettings(db, owner, { featured_job_id: null, featured_before_id: null, featured_after_id: null });
    }
    return;
  }
  if (selection.before_id === selection.after_id) throw new JobError("Elige dos fotos distintas.");
  await publishedJob(db, owner, selection.job_id, "Publica el trabajo antes de destacarlo en la portada.");
  const media = await jobMedia(db, selection.job_id);
  // Una foto oculta del muro SÍ puede ser el Antes o el Después: solo se ve en la portada y mientras esté destacada.
  if (!media.some((photo) => photo.id === selection.before_id) || !media.some((photo) => photo.id === selection.after_id)) throw new JobError("Las fotos deben ser de este trabajo.", 404);
  await saveSettings(db, owner, { featured_job_id: selection.job_id, featured_before_id: selection.before_id, featured_after_id: selection.after_id });
}

export async function applyPortfolioPatch(db: Client, owner: string, patch: PortfolioPatch) {
  if ("pinned_job_id" in patch) return setPinnedJob(db, owner, patch.pinned_job_id);
  return setFeaturedTransformation(db, owner, patch.featured);
}

// Ocultar/mostrar una foto en el muro. No toca originales, master ni sidecars. Si es el Antes o el Después de la
// portada, sigue visible en la portada mientras esté destacada.
export async function setPhotoHidden(db: Client, owner: string, jobId: string, mediaId: string, hidden: boolean) {
  await ownedJob(db, owner, jobId);
  if (!isUuid(mediaId)) throw new JobError("Fotografía no encontrada", 404);
  const result = await db.from("job_media").update({ hidden_from_home: hidden }).eq("id", mediaId).eq("job_id", jobId).select("id");
  if (result.error) throw new JobError("No se pudo guardar la visibilidad de la foto. Reintenta.", 503);
  if (result.data?.length !== 1) throw new JobError("Fotografía no encontrada", 404);
}

async function jobName(db: Client, owner: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const result = await db.from("jobs").select("name").eq("id", id).eq("owner_id", owner).maybeSingle();
  if (result.error) throw new JobError("No se pudo cargar la portada. Reintenta.", 503);
  return result.data?.name ?? null;
}
export async function curationState(db: Client, owner: string, jobId: string): Promise<CurationState> {
  const settings = await portfolioSettings(db, owner);
  const pinned = settings?.pinned_job_id === jobId;
  const featuredHere = settings?.featured_job_id === jobId;
  return {
    pinned,
    otherPinnedName: settings?.pinned_job_id && !pinned ? await jobName(db, owner, settings.pinned_job_id) : null,
    featured: settings && featuredHere ? { beforeId: settings.featured_before_id, afterId: settings.featured_after_id } : null,
    otherFeaturedName: settings?.featured_job_id && !featuredHere ? await jobName(db, owner, settings.featured_job_id) : null,
  };
}
// Marcas para la lista /app: qué trabajo está fijado y cuál aporta la transformación de la portada.
export async function curationMarks(db: Client, owner: string): Promise<{ pinnedJobId: string | null; featuredJobId: string | null }> {
  const settings = await portfolioSettings(db, owner);
  return { pinnedJobId: settings?.pinned_job_id ?? null, featuredJobId: settings?.featured_before_id && settings.featured_after_id ? settings.featured_job_id : null };
}

// Reordena las fotos de un trabajo de forma atómica (RPC reorder_job_media). Permitido con el trabajo publicado.
export async function reorderPhotos(db: Client, owner: string, jobId: string, order: readonly string[]) {
  await ownedJob(db, owner, jobId);
  const result = await db.rpc("reorder_job_media", { p_job: jobId, p_order: [...order] });
  if (!result.error) return;
  if (result.error.code === "22023") throw new JobError("Las fotos han cambiado desde que abriste la pantalla. Recarga para ver el orden actual.", 409);
  if (result.error.code === "P0002") throw new JobError("Trabajo no encontrado", 404);
  throw new JobError("No se pudo guardar el orden. Reintenta.", 503);
}

export const PORTADA_PAGE_SIZE = 12;
export type PortadaJob = { job: Job; media: Media[] };
// Publicar/despublicar sin entrar en la ficha. Misma ruta segura que el formulario (finishJob): al publicar comprueba o
// recupera los derivados de cada foto y normaliza posiciones; si una foto sigue incompleta, el trabajo permanece privado.
export async function setPublished(db: Client, owner: string, jobId: string, published: boolean) {
  const job = await ownedJob(db, owner, jobId);
  if (job.is_public === published) return;
  await finishJob(db, owner, jobId, { name: job.name, job_date: job.job_date, paint_code: job.paint_code, work_hours: job.work_hours, description: job.description, is_public: published });
}

// Trabajos en el orden de la web: primero los publicados (el fijado el primero, luego fecha descendente y UUID ascendente)
// y al final los privados con el mismo criterio. Incluye los publicados que no salen en el muro (sin fotos visibles) para
// poder arreglarlos; la pantalla los marca.
export async function portadaJobs(db: Client, owner: string, page: number): Promise<{ jobs: PortadaJob[]; hasNext: boolean; settings: PortfolioSettings | null }> {
  const settings = await portfolioSettings(db, owner);
  const all = await db.from("jobs").select("*").eq("owner_id", owner);
  if (all.error) throw new JobError("No se pudieron cargar los trabajos. Reintenta.", 503);
  const pinned = settings?.pinned_job_id;
  const ordered = [...all.data].sort((a, b) => Number(b.is_public) - Number(a.is_public) || Number(b.is_public && b.id === pinned) - Number(a.is_public && a.id === pinned) || (a.job_date < b.job_date ? 1 : a.job_date > b.job_date ? -1 : 0) || (a.id < b.id ? -1 : 1));
  const start = (Math.max(1, page) - 1) * PORTADA_PAGE_SIZE;
  const slice = ordered.slice(start, start + PORTADA_PAGE_SIZE);
  const jobs = await Promise.all(slice.map(async (job) => ({ job, media: await jobMedia(db, job.id) })));
  return { jobs, hasNext: ordered.length > start + PORTADA_PAGE_SIZE, settings };
}
