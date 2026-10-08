import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { parsePublicJobs } from "@/features/portfolio/contract";
import type { Database } from "@/lib/supabase/database.types";

const { url, key } = getSupabaseConfig();
const anon = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

describe("Supabase HTTP real, sin credenciales privadas", () => {
  it.each(["jobs", "job_media"] as const)("deniega lectura anónima directa de %s", async (table) => {
    const { data, error } = await anon.from(table).select("*");
    expect(error?.code).toBe("42501");
    expect(data).toBeNull();
  });
  it("permite únicamente el RPC público con contrato restringido", async () => {
    const { data, error } = await anon.rpc("list_public_jobs");
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(parsePublicJobs(data)).toEqual(data);
    // Requiere la migración 20261008120000 aplicada. Las horas de trabajo nunca viajan en el contrato público.
    for (const row of data ?? []) expect(Object.keys(row).sort()).toEqual(["description", "id", "job_date", "media", "name"]);
  });
  it("no expone el esquema privado por el API REST", async () => {
    const response = await fetch(`${url}/rest/v1/rpc/public_jobs_projection`, {
      method: "POST",
      headers: { apikey: key, "content-type": "application/json", "content-profile": "private" },
      body: JSON.stringify({ p_limit: 1, p_offset: 0 }),
    });
    expect(response.status).toBe(406);
    expect((await response.json()).code).toBe("PGRST106");
  });
  it("tiene cerrado el registro público en Auth remoto", async () => {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    expect(response.ok).toBe(true);
    const settings = await response.json();
    expect(settings.disable_signup, "Desactivar Allow new users to sign up en Auth; config.toml solo afecta al entorno local").toBe(true);
    expect(settings.external?.anonymous_users, "Desactivar anonymous sign-ins en Auth remoto").toBe(false);
  });
});
