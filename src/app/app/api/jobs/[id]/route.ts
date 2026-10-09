import { mutation } from "@/features/jobs/http";
import { deleteJob, finishJob, prepareJob } from "@/features/jobs/data";
import { setPublished } from "@/features/jobs/curation";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => {
    const { id } = await context.params; const body = await request.json();
    if (body.phase === "prepare") await prepareJob(supabase, user.id, id, body.job, false);
    else if (body.phase === "finish") await finishJob(supabase, user.id, id, body.job);
    // Publicar/despublicar desde la pantalla «Portada», sin pasar por el formulario de edición.
    else if (body.phase === "publish" && typeof body.published === "boolean") await setPublished(supabase, user.id, id, body.published);
    else throw new Error("Operación inválida");
  });
}
export async function DELETE(request: Request, context: Context) {
  return mutation(request, async ({ supabase, user }) => { await deleteJob(supabase, user.id, (await context.params).id); });
}
