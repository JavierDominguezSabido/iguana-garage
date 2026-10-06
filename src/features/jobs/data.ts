import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { buildOriginalPath, isUuid, validateJob, validateMediaMetadata } from "./validation";
import type { JobInput } from "./validation";
import { processJobImage } from "./image-processing";
import { removeMediaSafely } from "./workflow";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Media = Database["public"]["Tables"]["job_media"]["Row"];
type Client = SupabaseClient<Database>;
export class JobError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function checkId(id: string) { if (!isUuid(id)) throw new JobError("Trabajo no encontrado", 404); }
export async function ownedJob(db: Client, owner: string, id: string): Promise<Job> {
  checkId(id);
  const result = await db.from("jobs").select("*").eq("id", id).eq("owner_id", owner).maybeSingle();
  if (result.error) throw new JobError("No se pudo cargar el trabajo. Reintenta.", 503);
  if (!result.data) throw new JobError("Trabajo no encontrado", 404);
  return result.data;
}
export async function jobMedia(db: Client, jobId: string): Promise<Media[]> {
  const rows: Media[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await db.from("job_media").select("*").eq("job_id", jobId).order("position").range(offset, offset + 99);
    if (result.error) throw new JobError("No se pudieron cargar las fotografías", 503);
    rows.push(...result.data); if (result.data.length < 100) return rows;
  }
}
async function objectExists(db: Client, bucket: string, path: string): Promise<boolean> {
  const index = path.lastIndexOf("/"); const folder = path.slice(0, index); const name = path.slice(index + 1);
  const result = await db.storage.from(bucket).list(folder, { search: name, limit: 100 });
  if (result.error) throw new JobError("Storage no disponible. Conservamos los datos para reintentar.", 503);
  return result.data.some((item) => item.name === name);
}
async function removeObject(db: Client, bucket: string, path: string) {
  if (!await objectExists(db, bucket, path)) return;
  const result = await db.storage.from(bucket).remove([path]);
  if (result.error || await objectExists(db, bucket, path)) throw new JobError("No se pudo eliminar una fotografía. Reintenta; sus metadatos se conservan.", 503);
}
async function putObject(db: Client, bucket: string, path: string, bytes: Uint8Array, mime: string) {
  if (await objectExists(db, bucket, path)) {
    const existing = await db.storage.from(bucket).download(path);
    if (existing.error || !existing.data || !Buffer.from(await existing.data.arrayBuffer()).equals(Buffer.from(bytes))) throw new JobError("Esta fotografía requiere otro identificador para evitar reemplazos.", 409);
    return;
  }
  const result = await db.storage.from(bucket).upload(path, bytes, { contentType: mime, cacheControl: "0", upsert: false });
  if (result.error) throw new JobError("No se pudo subir una fotografía. Reintenta sin cerrar este formulario.", 503);
}
export async function prepareJob(db: Client, owner: string, id: string, input: unknown, create: boolean) {
  checkId(id); const fields = validateJob(input);
  if (create) {
    const existing = await db.from("jobs").select("id").eq("id", id).eq("owner_id", owner).maybeSingle();
    if (existing.error) throw new JobError("No se pudo comprobar el guardado", 503);
    if (!existing.data) {
      const result = await db.from("jobs").insert({ ...fields, is_public: false, id, owner_id: owner });
      if (result.error) throw new JobError("No se pudo crear el trabajo. Reintenta.", 503);
      return;
    }
  }
  await ownedJob(db, owner, id);
  const result = await db.from("jobs").update({ ...fields, is_public: false }).eq("id", id).eq("owner_id", owner).select("id");
  if (result.error || result.data?.length !== 1) throw new JobError("No se pudo guardar el trabajo", 503);
}
export async function finishJob(db: Client, owner: string, id: string, input: unknown) {
  await ownedJob(db, owner, id); const fields: JobInput = validateJob(input);
  const media = await jobMedia(db, id);
  for (let position = 0; position < media.length; position++) {
    const photo = media[position];
    if (fields.is_public && !await objectExists(db, "portfolio-derivatives", `${id}/${photo.id}.webp`)) {
      // Recupera una subida interrumpida también después de volver a abrir el formulario.
      const original = await db.storage.from("job-originals").download(photo.storage_path);
      if (original.error || !original.data) throw new JobError("Una fotografía sigue incompleta. El trabajo permanece privado.", 503);
      const processed = await processJobImage(new Uint8Array(await original.data.arrayBuffer()), photo.mime_type);
      await putObject(db, "portfolio-derivatives", `${id}/${photo.id}.webp`, processed.webp, "image/webp");
    }
    if (photo.position !== position) {
      const updated = await db.from("job_media").update({ position }).eq("id", photo.id).eq("job_id", id).select("id");
      if (updated.error || updated.data?.length !== 1) throw new JobError("No se pudo ordenar las fotografías. Reintenta.", 503);
    }
  }
  const result = await db.from("jobs").update(fields).eq("id", id).eq("owner_id", owner).select("id");
  if (result.error || result.data?.length !== 1) throw new JobError("No se pudo finalizar el guardado. Reintenta.", 503);
}
export async function uploadPhoto(db: Client, owner: string, jobId: string, mediaId: string, file: File) {
  await ownedJob(db, owner, jobId); checkId(mediaId);
  const bytes = new Uint8Array(await file.arrayBuffer());
  let processed;
  try { processed = await processJobImage(bytes, file.type); }
  catch { throw new JobError("No se pudo leer esta foto. Usa JPEG, PNG o WebP sin animación y de hasta 40 megapíxeles."); }
  const path = buildOriginalPath(owner, jobId, mediaId, file.type);
  const existing = await db.from("job_media").select("*").eq("id", mediaId).eq("job_id", jobId).maybeSingle();
  if (existing.error) throw new JobError("No se pudo comprobar la fotografía", 503);
  if (existing.data && existing.data.storage_path !== path) throw new JobError("Fotografía incompatible", 409);
  await putObject(db, "job-originals", path, bytes, file.type);
  if (!existing.data) {
    const last = await db.from("job_media").select("position").eq("job_id", jobId).order("position", { ascending: false }).limit(1);
    if (last.error) throw new JobError("No se pudo ordenar la fotografía. Reintenta.", 503);
    const metadata = validateMediaMetadata({ storage_path: path, mime_type: file.type, position: (last.data[0]?.position ?? -1) + 1, width: processed.width, height: processed.height, byte_size: bytes.length }, { ownerId: owner, jobId, mediaId });
    const inserted = await db.from("job_media").insert({ ...metadata, id: mediaId, job_id: jobId });
    if (inserted.error) {
      await removeObject(db, "job-originals", path);
      throw new JobError("No se pudo registrar la fotografía. Reintenta.", 503);
    }
  }
  // Si esta parte falla, conservar original + metadatos: el mismo ID permite reanudar.
  await putObject(db, "portfolio-derivatives", `${jobId}/${mediaId}.webp`, processed.webp, "image/webp");
}
export async function deletePhoto(db: Client, owner: string, jobId: string, mediaId: string) {
  await ownedJob(db, owner, jobId); checkId(mediaId);
  const result = await db.from("job_media").select("*").eq("id", mediaId).eq("job_id", jobId).maybeSingle();
  if (result.error) throw new JobError("No se pudo cargar la fotografía", 503);
  if (!result.data) return; // Reintento de un borrado ya completado.
  const photo = result.data;
  await removeMediaSafely({
    derivative: () => removeObject(db, "portfolio-derivatives", `${jobId}/${photo.id}.webp`),
    original: () => removeObject(db, "job-originals", photo.storage_path),
    metadata: async () => {
      const removed = await db.from("job_media").delete().eq("id", photo.id).eq("job_id", jobId).select("id");
      if (removed.error || removed.data?.length !== 1) throw new JobError("No se pudieron eliminar los metadatos. Reintenta.", 503);
    },
  });
}
export async function deleteJob(db: Client, owner: string, id: string) {
  const job = await ownedJob(db, owner, id);
  await prepareJob(db, owner, id, { name: job.name, job_date: job.job_date, paint_code: job.paint_code, is_public: false }, false);
  for (const photo of await jobMedia(db, id)) await deletePhoto(db, owner, id, photo.id);
  // También limpiar originales de subidas interrumpidas sin metadatos.
  const prefix = `${owner}/${id}`;
  for (;;) {
    const listed = await db.storage.from("job-originals").list(prefix, { limit: 100 });
    if (listed.error) throw new JobError("No se pudo revisar Storage. El trabajo se conserva para reintentar.", 503);
    if (!listed.data.length) break;
    for (const object of listed.data) await removeObject(db, "job-originals", `${prefix}/${object.name}`);
  }
  const removed = await db.from("jobs").delete().eq("id", id).eq("owner_id", owner).select("id");
  if (removed.error || removed.data?.length !== 1) throw new JobError("No se pudo eliminar el trabajo. Reintenta.", 503);
}
