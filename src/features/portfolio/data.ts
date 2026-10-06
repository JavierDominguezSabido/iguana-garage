import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parsePublicJobs } from "./contract";
import { PUBLIC_PAGE_SIZE } from "./delivery";

export function publicSupabase() {
  const { url, key } = getSupabaseConfig();
  // Independiente de cookies/sesiones, incluso cuando visita la home un propietario.
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(12_000) }) },
  });
}
export async function publicJobs(page: number) {
  const { data, error } = await publicSupabase().rpc("list_public_jobs", { p_limit: PUBLIC_PAGE_SIZE + 1, p_offset: (page - 1) * PUBLIC_PAGE_SIZE });
  if (error) throw new Error("No se pudieron cargar los trabajos");
  const jobs = parsePublicJobs(data);
  return { jobs: jobs.slice(0, PUBLIC_PAGE_SIZE), hasNext: jobs.length > PUBLIC_PAGE_SIZE };
}
