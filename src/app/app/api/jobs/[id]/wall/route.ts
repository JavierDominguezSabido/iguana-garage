import { mutation } from "@/features/jobs/http";
import { moveWallJob } from "@/features/jobs/curation";
import { validateWallMove } from "@/features/jobs/validation";
type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";
// Mueve un trabajo publicado a otra posición del muro de forma atómica. Autorizado por propietario + RLS.
export async function PATCH(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => { const { id } = await context.params; await moveWallJob(supabase, user.id, id, validateWallMove(await request.json()).to); });
}
