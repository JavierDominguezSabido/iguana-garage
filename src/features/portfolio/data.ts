import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parsePublicJobs } from "./contract";
import { parseFeaturedTransformation } from "./transformation";
import type { PublicTransformation } from "./transformation";
import type { PublicJob } from "./contract";
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
// Transformación destacada elegida en /app. Independiente de la paginación: el trabajo puede no estar en la página actual.
export async function featuredTransformation() {
  const { data, error } = await publicSupabase().rpc("get_featured_transformation");
  if (error) throw new Error("No se pudo cargar la transformación destacada");
  return parseFeaturedTransformation(data);
}
// Datos de la home. El muro y la portada se piden en paralelo y fallan por separado: si falla la transformación
// (o no hay ninguna, o estamos en la página 2+) la portada queda con el título solo y el muro sigue.
export async function homeData(page: number): Promise<{ jobs: PublicJob[]; hasNext: boolean; failed: boolean; transformation: PublicTransformation | undefined }> {
  const [wall, cover] = await Promise.allSettled([publicJobs(page), page === 1 ? featuredTransformation() : Promise.resolve(undefined)]);
  return {
    jobs: wall.status === "fulfilled" ? wall.value.jobs : [], hasNext: wall.status === "fulfilled" && wall.value.hasNext, failed: wall.status === "rejected",
    transformation: cover.status === "fulfilled" ? cover.value : undefined,
  };
}
