import { mutation } from "@/features/jobs/http";
import { prepareJob } from "@/features/jobs/data";

export async function POST(request: Request) {
  return mutation(request, async ({ supabase, user }) => {
    const body = await request.json();
    await prepareJob(supabase, user.id, body.id, body.job, true);
  });
}
