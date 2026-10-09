import { mutation } from "@/features/jobs/http";
import { reorderPhotos } from "@/features/jobs/curation";
import { validatePhotoOrder } from "@/features/jobs/validation";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
// Reordena las fotos de un trabajo de forma atómica. Autorizado por propietario + RLS.
export async function PATCH(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => { const { id } = await context.params; await reorderPhotos(supabase, user.id, id, validatePhotoOrder(await request.json()).order); });
}
