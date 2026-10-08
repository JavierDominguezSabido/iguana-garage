// Interno de Node: la aplicación accede exclusivamente por data.ts (server-only).
import { Buffer } from "node:buffer";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isUuid } from "../validation";
import { processJobImage } from "../image-processing";
import { derivativePath, PREPARED_IMAGE_WIDTHS, type PreparedWidth } from "@/features/portfolio/variants";

if (typeof window !== "undefined") throw new Error("Solo disponible en servidor");

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type Media = Database["public"]["Tables"]["job_media"]["Row"];
export type Client = SupabaseClient<Database>;
export class JobError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function checkId(id: string) { if (!isUuid(id)) throw new JobError("Trabajo no encontrado", 404); }
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
export async function objectExists(db: Client, bucket: string, path: string): Promise<boolean> {
  const index = path.lastIndexOf("/"); const folder = path.slice(0, index); const name = path.slice(index + 1);
  const result = await db.storage.from(bucket).list(folder, { search: name, limit: 100 });
  if (result.error) throw new JobError("Storage no disponible. Conservamos los datos para reintentar.", 503);
  return result.data.some((item) => item.name === name);
}
export async function removeObject(db: Client, bucket: string, path: string) {
  if (!await objectExists(db, bucket, path)) return;
  const result = await db.storage.from(bucket).remove([path]);
  if (result.error || await objectExists(db, bucket, path)) throw new JobError("No se pudo eliminar una fotografía. Reintenta; sus metadatos se conservan.", 503);
}
export async function putObject(db: Client, bucket: string, path: string, bytes: Uint8Array, mime: string) {
  if (await objectExists(db, bucket, path)) {
    const existing = await db.storage.from(bucket).download(path);
    if (existing.error || !existing.data || !Buffer.from(await existing.data.arrayBuffer()).equals(Buffer.from(bytes))) throw new JobError("Esta fotografía requiere otro identificador para evitar reemplazos.", 409);
    return;
  }
  const result = await db.storage.from(bucket).upload(path, bytes, { contentType: mime, cacheControl: "0", upsert: false });
  if (result.error) throw new JobError("No se pudo subir una fotografía. Reintenta sin cerrar este formulario.", 503);
}
export async function putDerivatives(db: Client, jobId: string, mediaId: string, processed: Awaited<ReturnType<typeof processJobImage>>, widths: readonly PreparedWidth[] = PREPARED_IMAGE_WIDTHS) {
  const created: string[] = [];
  try {
    // Master al final: conserva la señal de foto completa de la proyección legacy.
    for (const width of widths) {
      const path = derivativePath(jobId, mediaId, width);
      if (!await objectExists(db,"portfolio-derivatives",path)) created.push(path);
      // Registrar antes de upload también permite limpiar un ACK perdido.
      await putObject(db,"portfolio-derivatives",path,processed.variants[width],"image/webp");
    }
  } catch (error) {
    const cleanup = await Promise.allSettled(created.map(path=>removeObject(db,"portfolio-derivatives",path)));
    if (cleanup.some(result=>result.status==="rejected")) throw new JobError("La foto sigue incompleta. Conservamos original y metadatos para reintentar la limpieza.",503);
    throw error;
  }
}
// Mantenimiento explícito owner-only; nunca se llama desde visitas ni publicación.
export async function prepareLegacyVariants(db: Client, owner: string, jobId: string, mediaId: string, apply = false): Promise<string[]> {
  await ownedJob(db,owner,jobId);checkId(mediaId);
  const row=await db.from("job_media").select("*").eq("job_id",jobId).eq("id",mediaId).maybeSingle();
  if(row.error || !row.data)throw new JobError("Fotografía no encontrada",404);
  if(!await objectExists(db,"portfolio-derivatives",derivativePath(jobId,mediaId,1600)))throw new JobError("Falta el master. Reanuda primero el guardado del trabajo.",409);
  const missing: PreparedWidth[]=[];
  for(const width of PREPARED_IMAGE_WIDTHS)if(width!==1600 && !await objectExists(db,"portfolio-derivatives",derivativePath(jobId,mediaId,width)))missing.push(width);
  if(apply && missing.length){
    const original=await db.storage.from("job-originals").download(row.data.storage_path);
    if(original.error || !original.data)throw new JobError("No se pudo leer el original privado",503);
    const processed=await processJobImage(new Uint8Array(await original.data.arrayBuffer()),row.data.mime_type);
    await putDerivatives(db,jobId,mediaId,processed,missing);
  }
  return missing.map(width=>derivativePath(jobId,mediaId,width));
}
