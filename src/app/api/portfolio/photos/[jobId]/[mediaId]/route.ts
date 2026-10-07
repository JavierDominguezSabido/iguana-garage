import { publicSupabase } from "@/features/portfolio/data";
import { publicPhotoResponse } from "@/features/portfolio/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, context: { params: Promise<{ jobId: string; mediaId: string }> }) {
  const { jobId, mediaId } = await context.params;
  return publicPhotoResponse(jobId,mediaId,new URL(request.url),path=>publicSupabase().storage.from("portfolio-derivatives").download(path));
}
