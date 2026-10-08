import { requireAuthenticatedSupabase } from "@/lib/supabase/server";
import { isUuid } from "@/features/jobs/validation";
import { privateJson } from "@/features/jobs/http";
import {derivativePath,PREPARED_IMAGE_WIDTHS} from "@/features/portfolio/variants";
import type {PreparedWidth} from "@/features/portfolio/variants";
function missing(error:unknown):boolean {
  if(!error || typeof error!=="object")return false;
  const status=Number("statusCode" in error?error.statusCode:"status" in error?error.status:0);
  return [400,401,403,404].includes(status);
}
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let auth;
  try { auth = await requireAuthenticatedSupabase(); } catch { return privateJson({ error: "Sesión no válida" }, 401); }
  const { id } = await context.params;
  if (!isUuid(id)) return privateJson({ error: "Imagen no encontrada" }, 404);
  const query=new URL(request.url).searchParams;
  const original=query.get("original")==="1";
  const rawWidth=query.get("w");
  const width=rawWidth===null?1600:Number(rawWidth);
  if([...query.keys()].some(key=>!["w","original"].includes(key)) ||
    query.getAll("w").length>1 || query.getAll("original").length>1 ||
    (query.has("original")&&!original) || (original&&query.has("w")) ||
    (rawWidth!==null && (String(width)!==rawWidth || !PREPARED_IMAGE_WIDTHS.includes(width as PreparedWidth))))
    return privateJson({error:"Imagen no encontrada"},404);
  try {
    const row = await auth.supabase.from("job_media").select("job_id,storage_path,mime_type").eq("id", id).maybeSingle();
    if (row.error || !row.data) return privateJson({ error: "Imagen no encontrada" }, 404);
    const bucket = original ? "job-originals" : "portfolio-derivatives";
    const path = original ? row.data.storage_path : derivativePath(row.data.job_id,id,width as PreparedWidth);
    let object = await auth.supabase.storage.from(bucket).download(path);
    let fallback=false;
    if (!original && width!==1600 && missing(object.error)) {
      object=await auth.supabase.storage.from(bucket).download(derivativePath(row.data.job_id,id,1600));fallback=true;
    }
    if (object.error || !object.data) return privateJson({ error: "No se pudo cargar la imagen" }, missing(object.error)?404:503);
    return new Response(await object.data.arrayBuffer(), { headers: {
      "Content-Type": original?(object.data.type||row.data.mime_type):"image/webp",
      "Cache-Control": "private, no-store", "CDN-Cache-Control":"no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Iguana-Image-Source":original?"original":fallback?"legacy-fallback":"prepared",
    } });
  } catch {return privateJson({error:"No se pudo cargar la imagen"},503);}
}
