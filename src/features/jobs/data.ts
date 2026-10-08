import "server-only";
import { buildOriginalPath, validateFocalPoint, validateJob, validateMediaMetadata } from "./validation";
import type { JobInput } from "./validation";
import { processJobImage } from "./image-processing";
import { removeMediaSafely } from "./workflow";
import { derivativePaths } from "@/features/portfolio/variants";
import { JobError, checkId, ownedJob, jobMedia, objectExists, putObject, putDerivatives, removeObject } from "./server/media";
import type { Client } from "./server/media";
export { JobError, ownedJob, jobMedia, prepareLegacyVariants } from "./server/media";
export type { Client, Job, Media } from "./server/media";

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
      await putDerivatives(db,id,photo.id,processed);
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
  const job=await ownedJob(db, owner, jobId); checkId(mediaId);
  // El formulario ya usa prepareJob. Aplicar la misma garantía al acceso directo.
  if(job.is_public)throw new JobError("Retira el trabajo del portfolio antes de añadir fotografías.",409);
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
    try {
      const last = await db.from("job_media").select("position").eq("job_id", jobId).order("position", { ascending: false }).limit(1);
      if (last.error) throw new JobError("No se pudo ordenar la fotografía. Reintenta.", 503);
      const metadata = validateMediaMetadata({ storage_path: path, mime_type: file.type, position: (last.data[0]?.position ?? -1) + 1, width: processed.width, height: processed.height, byte_size: bytes.length }, { ownerId: owner, jobId, mediaId });
      const inserted = await db.from("job_media").insert({ ...metadata, id: mediaId, job_id: jobId });
      if (inserted.error) throw new JobError("No se pudo registrar la fotografía. Reintenta.", 503);
    } catch(error) {
      // Si el ACK de INSERT se perdió, no borrar el original de una fila existente.
      const registered=await db.from("job_media").select("id").eq("id",mediaId).eq("job_id",jobId).maybeSingle();
      if(!registered.error && !registered.data) await removeObject(db,"job-originals",path);
      throw error;
    }
  }
  // Si esta parte falla, conservar original + metadatos: el mismo ID permite reanudar.
  await putDerivatives(db,jobId,mediaId,processed);
}
// Solo presentación (object-position): no reprocesa ni toca originales, master ni variantes. Permitido con el trabajo publicado.
export async function setFocalPoint(db: Client, owner: string, jobId: string, mediaId: string, input: unknown) {
  const focal = validateFocalPoint(input);
  await ownedJob(db, owner, jobId); checkId(mediaId);
  const result = await db.from("job_media").update(focal).eq("id", mediaId).eq("job_id", jobId).select("id");
  if (result.error) throw new JobError("No se pudo guardar el encuadre. Reintenta.", 503);
  if (result.data?.length !== 1) throw new JobError("Fotografía no encontrada", 404);
}
export async function deletePhoto(db: Client, owner: string, jobId: string, mediaId: string) {
  await ownedJob(db, owner, jobId); checkId(mediaId);
  const result = await db.from("job_media").select("*").eq("id", mediaId).eq("job_id", jobId).maybeSingle();
  if (result.error) throw new JobError("No se pudo cargar la fotografía", 503);
  if (!result.data) return; // Reintento de un borrado ya completado.
  const photo = result.data;
  await removeMediaSafely({
    derivative: async () => {
      for(const path of derivativePaths(jobId,photo.id)) await removeObject(db,"portfolio-derivatives",path);
    },
    original: () => removeObject(db, "job-originals", photo.storage_path),
    metadata: async () => {
      const removed = await db.from("job_media").delete().eq("id", photo.id).eq("job_id", jobId).select("id");
      if (removed.error || removed.data?.length !== 1) throw new JobError("No se pudieron eliminar los metadatos. Reintenta.", 503);
    },
  });
}
export async function deleteJob(db: Client, owner: string, id: string) {
  const job = await ownedJob(db, owner, id);
  await prepareJob(db, owner, id, { name: job.name, job_date: job.job_date, paint_code: job.paint_code, work_hours: job.work_hours, description: job.description, is_public: false }, false);
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
