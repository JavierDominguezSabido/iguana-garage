import { publicSupabase } from "@/features/portfolio/data";
import { photoRequest } from "@/features/portfolio/delivery";
import { resizePublicPhoto } from "@/features/portfolio/image-processing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", "CDN-Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, context: { params: Promise<{ jobId: string; mediaId: string }> }) {
  const { jobId, mediaId } = await context.params;
  let photo;
  try { photo = photoRequest(jobId, mediaId, new URL(request.url)); }
  catch { return Response.json({ error: "Fotografía no disponible" }, { status: 404, headers }); }
  try {
    // La descarga con identidad anónima aplica RLS en cada petición; nunca originales.
    const { data, error } = await publicSupabase().storage.from("portfolio-derivatives").download(photo.path);
    if (error || !data) return Response.json({ error: "Fotografía no disponible" }, { status: 404, headers });
    const bytes = await resizePublicPhoto(new Uint8Array(await data.arrayBuffer()), photo.width);
    return new Response(new Uint8Array(bytes), { headers: { ...headers, "Content-Type": "image/webp" } });
  } catch { return Response.json({ error: "No se pudo cargar la fotografía" }, { status: 503, headers }); }
}
