import { mutation } from "@/features/jobs/http";
import { deletePhoto, JobError, setFocalPoint, uploadPhoto } from "@/features/jobs/data";
import { setPhotoHidden } from "@/features/jobs/curation";
import { MAX_IMAGE_BYTES, validatePhotoVisibility } from "@/features/jobs/validation";
import { readBoundedBody } from "@/features/jobs/upload-body";
type Context = { params: Promise<{ id: string; mediaId: string }> };
export const runtime = "nodejs";
export async function POST(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => {
    if (Number(request.headers.get("content-length")) > MAX_IMAGE_BYTES + 64_000) throw new JobError("La foto supera los 10 MB", 413);
    const bytes = await readBoundedBody(request, MAX_IMAGE_BYTES + 64_000);
    const form = await new Response(bytes, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData(); const file = form.get("photo");
    if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES) throw new JobError("Selecciona una imagen JPEG, PNG o WebP de hasta 10 MB");
    const { id, mediaId } = await context.params; await uploadPhoto(supabase, user.id, id, mediaId, file);
  });
}
export async function PATCH(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => {
    const { id, mediaId } = await context.params; const body: unknown = await request.json();
    // Mismo recurso, dos ajustes independientes de presentación: visibilidad en la home o punto focal.
    if (body && typeof body === "object" && "hidden" in body) { await setPhotoHidden(supabase, user.id, id, mediaId, validatePhotoVisibility(body).hidden); return; }
    await setFocalPoint(supabase, user.id, id, mediaId, body);
  });
}
export async function DELETE(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => { const { id, mediaId } = await context.params; await deletePhoto(supabase, user.id, id, mediaId); });
}
