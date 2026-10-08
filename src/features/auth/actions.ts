"use server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
