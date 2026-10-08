import { mutation } from "@/features/jobs/http";
import { applyPortfolioPatch } from "@/features/jobs/curation";
import { validatePortfolioPatch } from "@/features/jobs/validation";
export const runtime = "nodejs";
// Ajustes de la portada pública: trabajo fijado arriba o transformación destacada. Autorizado por propietario + RLS.
export async function PATCH(request: Request) {
  return mutation(request, async ({ supabase, user }) => { await applyPortfolioPatch(supabase, user.id, validatePortfolioPatch(await request.json())); });
}
