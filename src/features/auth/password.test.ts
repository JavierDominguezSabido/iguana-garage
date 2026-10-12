import { describe, expect, it, vi } from "vitest";
import { authFailure, changePasswordFlow, PASSWORD_MIN, readPasswordForm, validatePasswordChange } from "./password";

const current = "actual-antigua-1";
const next = "nueva-frase-larga-2";
const input = (overrides: Partial<{ current: string; next: string; confirm: string }> = {}) => ({ current, next, confirm: next, ...overrides });
const auth = (verify: unknown = null, update: unknown = null) => ({ verify: vi.fn(async () => verify as never), update: vi.fn(async () => update as never) });

describe("validatePasswordChange", () => {
  it("acepta una nueva contraseña válida, repetida y distinta de la actual", () => {
    expect(validatePasswordChange(input())).toBeNull();
  });

  it("exige la contraseña actual", () => {
    expect(validatePasswordChange(input({ current: "" }))).toMatchObject({ status: "error", field: "current", message: "Escribe tu contraseña actual." });
  });

  it("exige la nueva y su repetición", () => {
    expect(validatePasswordChange(input({ next: "" }))).toMatchObject({ field: "next", message: "Escribe la nueva contraseña." });
    expect(validatePasswordChange(input({ confirm: "" }))).toMatchObject({ field: "confirm", message: "Repite la nueva contraseña." });
  });

  it(`rechaza una nueva de menos de ${PASSWORD_MIN} caracteres`, () => {
    const short = "a".repeat(PASSWORD_MIN - 1);
    expect(validatePasswordChange(input({ next: short, confirm: short }))).toMatchObject({ field: "next", message: `La nueva contraseña es demasiado corta: usa al menos ${PASSWORD_MIN} caracteres.` });
    const exact = "a".repeat(PASSWORD_MIN);
    expect(validatePasswordChange(input({ next: exact, confirm: exact }))).toBeNull();
  });

  it("cuenta caracteres, no unidades UTF-16 (un emoji es uno)", () => {
    const emoji = "🔧".repeat(PASSWORD_MIN - 1);
    expect(validatePasswordChange(input({ next: emoji, confirm: emoji }))).toMatchObject({ field: "next" });
  });

  it("rechaza una nueva de más de 72 bytes, el límite del servicio de acceso", () => {
    const ascii = "a".repeat(72);
    expect(validatePasswordChange(input({ next: ascii, confirm: ascii }))).toBeNull();
    const long = "a".repeat(73);
    expect(validatePasswordChange(input({ next: long, confirm: long }))).toMatchObject({ field: "next", message: expect.stringContaining("demasiado larga") });
    const accents = "ñ".repeat(37);
    expect(validatePasswordChange(input({ next: accents, confirm: accents }))).toMatchObject({ field: "next", message: expect.stringContaining("demasiado larga") });
  });

  it("avisa si la repetición no coincide", () => {
    expect(validatePasswordChange(input({ confirm: `${next}x` }))).toMatchObject({ field: "confirm", message: "Las contraseñas nuevas no coinciden." });
  });

  it("no recorta espacios: una diferencia de espacios no coincide", () => {
    expect(validatePasswordChange(input({ confirm: `${next} ` }))).toMatchObject({ field: "confirm" });
  });

  it("exige que la nueva sea distinta de la actual", () => {
    expect(validatePasswordChange(input({ next: current, confirm: current }))).toMatchObject({ field: "next", message: "La nueva contraseña debe ser distinta de la actual." });
  });

  it("trata una actual desmesurada como incorrecta sin consultar a Auth", () => {
    expect(validatePasswordChange(input({ current: "a".repeat(1025) }))).toMatchObject({ field: "current", message: "La contraseña actual no es correcta." });
  });

  it("ningún mensaje repite la contraseña escrita", () => {
    for (const bad of [input({ confirm: "otra-distinta-123" }), input({ next: "x7Q2p", confirm: "x7Q2p" }), input({ next: current, confirm: current })]) {
      const message = validatePasswordChange(bad)?.message ?? "";
      expect(message).not.toContain(bad.next);
      expect(message).not.toContain(bad.current);
    }
  });
});

describe("readPasswordForm", () => {
  it("lee los tres campos sin alterarlos y descarta valores que no son texto", () => {
    const form = new FormData();
    form.set("current-password", " con espacios ");
    form.set("new-password", next);
    form.set("confirm-password", new Blob(["x"]));
    expect(readPasswordForm(form)).toEqual({ current: " con espacios ", next, confirm: "" });
  });
});

describe("authFailure", () => {
  it("convierte el límite de intentos en un aviso claro", () => {
    expect(authFailure({ status: 429, code: "over_request_rate_limit" }, "verify")).toMatchObject({ message: "Demasiados intentos. Espera unos minutos antes de volver a probar." });
    expect(authFailure({ status: 429 }, "update").message).toContain("Demasiados intentos");
  });

  it("la actual incorrecta señala su campo", () => {
    expect(authFailure({ status: 400, code: "invalid_credentials" }, "verify")).toMatchObject({ field: "current", message: "La contraseña actual no es correcta." });
    expect(authFailure({ status: 400 }, "verify")).toMatchObject({ field: "current" });
  });

  it("Auth caído o sin respuesta no se confunde con una contraseña incorrecta", () => {
    expect(authFailure({ status: 503 }, "verify").message).toContain("no está disponible");
    expect(authFailure({ status: 0 }, "update").message).toContain("no está disponible");
    expect(authFailure({ status: 500 }, "verify")).not.toHaveProperty("field");
  });

  it("sesión caducada", () => {
    expect(authFailure({ status: 401, code: "session_not_found" }, "update").message).toContain("sesión ha caducado");
    expect(authFailure({ status: 403, code: "session_not_found" }, "verify").message).toContain("sesión ha caducado");
  });

  it("errores del cambio: misma contraseña, contraseña débil y reautenticación", () => {
    expect(authFailure({ status: 422, code: "same_password" }, "update")).toMatchObject({ field: "next", message: "La nueva contraseña debe ser distinta de la actual." });
    expect(authFailure({ status: 422, code: "weak_password" }, "update")).toMatchObject({ field: "next", message: expect.stringContaining("requisitos") });
    expect(authFailure({ status: 401, code: "reauthentication_needed" }, "update").message).toContain("Cierra sesión, entra de nuevo");
  });

  it("cualquier otro fallo da un mensaje genérico según la fase", () => {
    expect(authFailure({ status: 400, code: "validation_failed" }, "update").message).toBe("No se pudo cambiar la contraseña. Reintenta.");
    expect(authFailure({ status: 400, code: "email_not_confirmed" }, "verify").message).toBe("No se pudo comprobar la contraseña actual. Reintenta.");
  });
});

describe("changePasswordFlow", () => {
  it("comprueba la actual, después cambia y anuncia el éxito", async () => {
    const calls = auth();
    await expect(changePasswordFlow(input(), calls)).resolves.toMatchObject({ status: "success", message: expect.stringContaining("Tu sesión sigue abierta") });
    expect(calls.verify).toHaveBeenCalledWith(current);
    expect(calls.update).toHaveBeenCalledWith(next);
    expect(calls.verify.mock.invocationCallOrder[0]).toBeLessThan(calls.update.mock.invocationCallOrder[0]);
  });

  it("no consulta a Auth si la validación falla", async () => {
    const calls = auth();
    await expect(changePasswordFlow(input({ confirm: "no-coincide-123" }), calls)).resolves.toMatchObject({ field: "confirm" });
    expect(calls.verify).not.toHaveBeenCalled();
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("no cambia nada si la actual es incorrecta", async () => {
    const calls = auth({ status: 400, code: "invalid_credentials" });
    await expect(changePasswordFlow(input(), calls)).resolves.toMatchObject({ status: "error", field: "current" });
    expect(calls.update).not.toHaveBeenCalled();
  });

  it("traslada el error del cambio", async () => {
    await expect(changePasswordFlow(input(), auth(null, { status: 429 }))).resolves.toMatchObject({ status: "error", message: expect.stringContaining("Demasiados intentos") });
  });

  it("un fallo de red no filtra detalles ni contraseñas", async () => {
    const calls = { verify: vi.fn(async () => { throw new Error(`fetch failed ${current}`); }), update: vi.fn() };
    const result = await changePasswordFlow(input(), calls);
    expect(result).toEqual({ status: "error", message: "No se pudo conectar. Reintenta en unos instantes." });
    expect(calls.update).not.toHaveBeenCalled();
  });
});
