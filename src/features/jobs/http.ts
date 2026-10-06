import "server-only";
import { requireAuthenticatedSupabase } from "@/lib/supabase/server";
import { JobError } from "./data";
import { sameOrigin } from "./request-security";

export function privateJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
export async function mutation(request: Request, action: (context: Awaited<ReturnType<typeof requireAuthenticatedSupabase>>) => Promise<void>) {
  if (!sameOrigin(request)) return privateJson({ error: "Solicitud no permitida" }, 403);
  let context;
  try { context = await requireAuthenticatedSupabase(); } catch { return privateJson({ error: "La sesión ha terminado. Vuelve a entrar." }, 401); }
  try { await action(context); return privateJson({ ok: true }); }
  catch (error) { return privateJson({ error: error instanceof JobError ? error.message : "No se pudo completar la operación. Revisa los datos y reintenta." }, error instanceof JobError ? error.status : 400); }
}
