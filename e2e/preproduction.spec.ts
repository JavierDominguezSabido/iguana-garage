import { randomUUID, createHash } from "node:crypto";
import { crc32 } from "node:zlib";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

test("cabeceras de producción, nonce e hidratación sin infracciones CSP", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(event.violatedDirective);
    });
  });
  for (const path of ["/", "/login"]) {
    const response = await page.goto(path);
    expect(response?.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response?.headers()["x-frame-options"]).toBe("DENY");
    expect(response?.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(response?.headers()["x-powered-by"]).toBeUndefined();
    const policy = response?.headers()["content-security-policy"] ?? "";
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeTruthy();
    expect(await page.locator("script[src]").evaluateAll((scripts) => scripts.every((script) => (script as HTMLScriptElement).nonce.length > 0))).toBe(true);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
    if (path === "/login") {
      expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
      expect(await page.locator("input").evaluateAll((inputs) => inputs.every((input) => parseFloat(getComputedStyle(input).fontSize) >= 16))).toBe(true);
    }
  }
});

test("subida de una imagen válida de 10 MiB mantiene el original completo", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "Un único recorrido basta para este límite del servidor");
  test.setTimeout(120_000);
  if (process.env.SUPABASE_TEST_DISPOSABLE !== "true" || process.env.SUPABASE_TEST_PROJECT_REF !== "atibisongftmspwtyndv" || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname !== "atibisongftmspwtyndv.supabase.co") throw new Error("Se requiere el proyecto de desarrollo autorizado");
  const owner = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await owner.auth.signInWithPassword({ email: process.env.SUPABASE_TEST_USER_A_EMAIL!, password: process.env.SUPABASE_TEST_USER_A_PASSWORD! });
  if (auth.error || !auth.data.user) throw new Error("Cuenta temporal no disponible; no se registran credenciales");
  const id = randomUUID(); const mediaId = randomUUID();
  // Foto demo real: chunk PNG auxiliar privado de relleno, únicamente en memoria.
  const png = await sharp(resolve("assets/demo/mercedes-clase-e/mercedes-clase-e-02-process-side.webp")).resize(600).png().toBuffer();
  const padding = Buffer.alloc(10 * 1024 * 1024 - png.length);
  padding.writeUInt32BE(padding.length - 12, 0); padding.write("paDd", 4, "ascii");
  padding.writeUInt32BE(crc32(padding.subarray(4, -4)), padding.length - 4);
  const photo = Buffer.concat([png.subarray(0, -12), padding, png.subarray(-12)]);
  expect((await sharp(photo).metadata()).format).toBe("png");
  try {
    await page.goto("/login");
    try {
      await page.getByLabel("Usuario", { exact: true }).fill(process.env.SUPABASE_TEST_USER_A_EMAIL!);
      await page.getByLabel("Contraseña", { exact: true }).fill(process.env.SUPABASE_TEST_USER_A_PASSWORD!);
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page.waitForURL("**/app");
    } catch {
      await page.locator("input").evaluateAll((inputs) => inputs.forEach((input) => { (input as HTMLInputElement).value = ""; })).catch(() => {});
      throw new Error("Acceso temporal no disponible; no se registran credenciales");
    }
    const status = await page.evaluate(async ({ id, mediaId, encoded }) => {
      const create = await fetch("/app/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, job: { name: "QA límite de subida", job_date: "2026-10-06", paint_code: null, is_public: false } }) });
      if (!create.ok) return create.status;
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      const form = new FormData(); form.set("photo", new File([bytes], "qa-limit.png", { type: "image/png" }));
      return (await fetch(`/app/api/jobs/${id}/photos/${mediaId}`, { method: "POST", body: form })).status;
    }, { id, mediaId, encoded: photo.toString("base64") });
    expect(status).toBe(200);
    const original = await owner.storage.from("job-originals").download(`${auth.data.user.id}/${id}/${mediaId}.png`);
    expect(original.error).toBeNull();
    const downloaded = Buffer.from(await original.data!.arrayBuffer());
    expect(downloaded.length).toBe(photo.length);
    expect(createHash("sha256").update(downloaded).digest("hex")).toBe(createHash("sha256").update(photo).digest("hex"));
  } finally {
    const status = await page.evaluate(async (id) => (await fetch(`/app/api/jobs/${id}`, { method: "DELETE" })).status, id);
    if (status !== 200 && status !== 404) throw new Error("Reintentar limpieza del fixture de límite con su propietario");
    await owner.auth.signOut();
  }
});
