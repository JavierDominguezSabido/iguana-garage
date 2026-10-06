import { requireAuthenticatedSupabase } from "@/lib/supabase/server";
import { isUuid } from "@/features/jobs/validation";
import { privateJson } from "@/features/jobs/http";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let auth;
  try { auth = await requireAuthenticatedSupabase(); } catch { return privateJson({ error: "Sesión no válida" }, 401); }
  const { id } = await context.params;
  if (!isUuid(id)) return privateJson({ error: "Imagen no encontrada" }, 404);
  const row = await auth.supabase.from("job_media").select("job_id,storage_path,mime_type").eq("id", id).maybeSingle();
  if (row.error || !row.data) return privateJson({ error: "Imagen no encontrada" }, 404);
  const original = new URL(request.url).searchParams.get("original") === "1";
  const bucket = original ? "job-originals" : "portfolio-derivatives";
  const path = original ? row.data.storage_path : `${row.data.job_id}/${id}.webp`;
  let object = await auth.supabase.storage.from(bucket).download(path);
  if (!original && object.error) object = await auth.supabase.storage.from("job-originals").download(row.data.storage_path);
  if (object.error || !object.data) return privateJson({ error: "No se pudo cargar la imagen" }, 503);
  return new Response(await object.data.arrayBuffer(), { headers: { "Content-Type": object.data.type || row.data.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
