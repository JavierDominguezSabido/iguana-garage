// Cambio de contraseña: validación y traducción de errores de Supabase Auth, sin dependencias de red para poder probarlo.
// Los mensajes nunca repiten lo escrito, y nada de aquí registra contraseñas.
export const PASSWORD_MIN = 12;
// Auth guarda la contraseña con bcrypt, que solo admite 72 bytes; más allá Auth la rechaza.
export const PASSWORD_MAX_BYTES = 72;
const CURRENT_MAX = 1024;

export type PasswordField = "current" | "next" | "confirm";
export type PasswordChangeState = { status: "idle" | "error" | "success"; message: string; field?: PasswordField };
export type PasswordInput = { current: string; next: string; confirm: string };
export type AuthFailure = { status?: number; code?: string };
export type PasswordAuth = { verify(current: string): Promise<AuthFailure | null>; update(next: string): Promise<AuthFailure | null> };

const fail = (message: string, field?: PasswordField): PasswordChangeState => field ? { status: "error", message, field } : { status: "error", message };
const WRONG_CURRENT = "La contraseña actual no es correcta.";
const SAME = "La nueva contraseña debe ser distinta de la actual.";

const text = (value: FormDataEntryValue | null) => typeof value === "string" ? value : "";
export function readPasswordForm(form: FormData): PasswordInput {
  return { current: text(form.get("current-password")), next: text(form.get("new-password")), confirm: text(form.get("confirm-password")) };
}

export function validatePasswordChange({ current, next, confirm }: PasswordInput): PasswordChangeState | null {
  if (!current) return fail("Escribe tu contraseña actual.", "current");
  if (current.length > CURRENT_MAX) return fail(WRONG_CURRENT, "current");
  if (!next) return fail("Escribe la nueva contraseña.", "next");
  if ([...next].length < PASSWORD_MIN) return fail(`La nueva contraseña es demasiado corta: usa al menos ${PASSWORD_MIN} caracteres.`, "next");
  if (new TextEncoder().encode(next).length > PASSWORD_MAX_BYTES) return fail(`La nueva contraseña es demasiado larga: usa como máximo ${PASSWORD_MAX_BYTES} caracteres (las letras con tilde o ñ cuentan doble).`, "next");
  if (!confirm) return fail("Repite la nueva contraseña.", "confirm");
  if (next !== confirm) return fail("Las contraseñas nuevas no coinciden.", "confirm");
  if (next === current) return fail(SAME, "next");
  return null;
}

export function authFailure({ status = 0, code }: AuthFailure, phase: "verify" | "update"): PasswordChangeState {
  if (status === 429 || code === "over_request_rate_limit") return fail("Demasiados intentos. Espera unos minutos antes de volver a probar.");
  if (status === 0 || status >= 500) return fail("El servicio de acceso no está disponible. Reintenta en unos instantes.");
  if (code === "reauthentication_needed") return fail("Por seguridad hay que volver a identificarse. Cierra sesión, entra de nuevo y repite el cambio.");
  if (code === "session_not_found" || code === "session_expired" || status === 401 || status === 403) return fail("Tu sesión ha caducado. Vuelve a entrar y repite el cambio.");
  if (phase === "verify") return code === "invalid_credentials" || (status === 400 && !code) ? fail(WRONG_CURRENT, "current") : fail("No se pudo comprobar la contraseña actual. Reintenta.");
  if (code === "same_password") return fail(SAME, "next");
  if (code === "weak_password") return fail("El servicio de acceso considera débil la nueva contraseña: no cumple sus requisitos. Prueba con otra más larga o variada.", "next");
  return fail("No se pudo cambiar la contraseña. Reintenta.");
}

// Orden: validar sin red → comprobar la actual → cambiar. Si un paso falla, no se da el siguiente.
export async function changePasswordFlow(input: PasswordInput, auth: PasswordAuth): Promise<PasswordChangeState> {
  const invalid = validatePasswordChange(input);
  if (invalid) return invalid;
  try {
    const verifyError = await auth.verify(input.current);
    if (verifyError) return authFailure(verifyError, "verify");
    const updateError = await auth.update(input.next);
    if (updateError) return authFailure(updateError, "update");
  } catch { return fail("No se pudo conectar. Reintenta en unos instantes."); }
  return { status: "success", message: "Contraseña cambiada. Tu sesión sigue abierta; la próxima vez entra con la nueva." };
}
