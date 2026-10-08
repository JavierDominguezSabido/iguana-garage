import "server-only";
import { redirect, notFound } from "next/navigation";
import { requireAuthenticatedSupabase } from "@/lib/supabase/server";
import { jobMedia, JobError, ownedJob } from "./data";
export async function privateContext() {
  try { return await requireAuthenticatedSupabase(); } catch { redirect("/app/login"); }
}
export async function privateJob(id: string) {
  const { supabase, user } = await privateContext();
  try { const job = await ownedJob(supabase, user.id, id); const media = await jobMedia(supabase, id); return { job, media }; }
  catch (error) { if (error instanceof JobError && error.status === 404) notFound(); throw error; }
}
export { displayDate } from "./format";
