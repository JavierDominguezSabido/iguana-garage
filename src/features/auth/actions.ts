"use server";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { changePasswordFlow, readPasswordForm } from "./password";
import type { PasswordChangeState } from "./password";
export type AuthState = { error: string };
export async function login(_previous: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim(); const password = String(form.get("password") ?? "");
  if (!email || email.length > 320 || !password || password.length > 1024) return { error: "Introduce tu usuario y contraseña." };
  try {
    const db = await createServerSupabaseClient({ writable: true });
    const result = await db.auth.signInWithPassword({ email, password });
    if (result.error && (result.error.status ?? 0) >= 500) return { error: "El servicio de acceso no está disponible. Reintenta en unos instantes." };
    if (result.error || !result.data.user || result.data.user.is_anonymous) return { error: "Usuario o contraseña incorrectos." };
  } catch { return { error: "No se pudo conectar. Reintenta en unos instantes." }; }
  redirect("/app");
}
export async function logout(_previous: AuthState): Promise<AuthState> {
  void _previous;
  try {
    const db = await createServerSupabaseClient({ writable: true });
    const result = await db.auth.signOut({ scope: "local" });
    if (result.error) return { error: "No se pudo cerrar la sesión. Reintenta." };
  } catch { return { error: "No se pudo cerrar la sesión. Reintenta." }; }
  redirect("/app/login");
}
// Cambio de contraseña con la sesión del propietario, sin service_role. La actual se comprueba con un inicio de sesión
// aparte (en memoria, sin cookies) que se cierra enseguida; la sesión del navegador no se toca y sigue activa.
// Las contraseñas no se registran ni vuelven al navegador.
export async function changePassword(_previous: PasswordChangeState, form: FormData): Promise<PasswordChangeState> {
  let db: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  try { db = await createServerSupabaseClient({ writable: true }); } catch { return { status: "error", message: "El servicio de acceso no está disponible. Reintenta en unos instantes." }; }
  return changePasswordFlow(readPasswordForm(form), {
    async verify(current) {
      const { data, error } = await db.auth.getUser();
      if (error && (error.status ?? 0) >= 500) return { status: error.status };
      if (error || !data.user || data.user.is_anonymous || !data.user.email) return { status: 401, code: "session_not_found" };
      const { url, key } = getSupabaseConfig();
      const probe = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
      });
      const result = await probe.auth.signInWithPassword({ email: data.user.email, password: current });
      if (result.error) return { status: result.error.status, code: result.error.code };
      try { await probe.auth.signOut({ scope: "local" }); } catch { /* cerrar la sesión de comprobación no condiciona el cambio */ }
      return result.data.user?.id === data.user.id ? null : { status: 400, code: "invalid_credentials" };
    },
    async update(next) {
      const { error } = await db.auth.updateUser({ password: next });
      return error ? { status: error.status, code: error.code } : null;
    },
  });
}
