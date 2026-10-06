import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createServerSupabaseClient({ writable = false } = {}) {
  const { url, key } = getSupabaseConfig();
  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => cookieStore.getAll(),
      // RSC es de solo lectura; Proxy renueva. Server Actions pueden solicitar escritura.
      ...(writable ? { setAll: (values: Parameters<NonNullable<CookieMethodsServer["setAll"]>>[0]) => {
        values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } } : {}),
    },
  });
}

// Cada futura lectura/mutación privada debe llamar a este helper, además de pasar por Proxy y RLS.
export async function requireAuthenticatedSupabase() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) throw new Error("Sesión no válida");
  return { supabase, user: data.user };
}
