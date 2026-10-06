import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import axe from "axe-core";
import sharp from "sharp";

async function accessible(page: Page) {
  await page.addScriptTag({ content: axe.source });
  const issues = await page.evaluate(async () => {
    const scanner = window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }> } };
    const result = await scanner.axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return result.violations.map((issue) => ({ id: issue.id, targets: issue.nodes.map((node) => node.target) }));
  });
  expect(issues).toEqual([]);
  const targets = await page.locator("button,a.button,a.back-link,label.publish-control").evaluateAll((elements) => elements.filter((element) => { const size = element.getBoundingClientRect(); return size.width && size.height; }).filter((element) => { const size = element.getBoundingClientRect(); return size.width < 44 || size.height < 44; }).map((element) => element.tagName));
  expect(targets).toEqual([]);
}

async function loginWithTemporaryAccount(page: Page, label: "A" | "B" = "A") {
  // Nunca adjuntar DOM/trace de los campos con credenciales reales ante errores.
  try {
    const email = process.env[`SUPABASE_TEST_USER_${label}_EMAIL`]; const password = process.env[`SUPABASE_TEST_USER_${label}_PASSWORD`];
    if (!email || !password) throw new Error();
    await page.getByLabel("Usuario", { exact: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/app", { timeout: 20000 });
  } catch {
    await page.locator('input[name="email"],input[name="password"]').evaluateAll((inputs) => inputs.forEach((input) => { (input as HTMLInputElement).value = ""; })).catch(() => {});
    throw new Error("No se pudo iniciar sesión con la cuenta temporal local; no se registran sus valores.");
  }
}
test("área privada: acceso, CRUD, fotos, publicación y limpieza", async ({ page, browser }, testInfo) => {
  if (process.env.SUPABASE_TEST_DISPOSABLE !== "true" || process.env.SUPABASE_TEST_PROJECT_REF !== "atibisongftmspwtyndv" || new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://invalid").hostname !== "atibisongftmspwtyndv.supabase.co") throw new Error("QA requiere el proyecto de desarrollo autorizado");
  const suffix = randomUUID().slice(0, 8); const name = `QA Mercedes ${suffix}`; let jobId = "";
  const origin = "http://127.0.0.1:3100";
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const failures: string[] = []; page.on("pageerror", () => { failures.push("browser-error"); });
  page.on("request", (request) => { if (request.method() === "POST" && new URL(request.url()).pathname === "/app/api/jobs") { try { jobId = request.postDataJSON().id; } catch {} } });
  const layoutCheck = async () => {
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(() => page.locator('img').evaluateAll((images) => images.filter((image) => { const box = image.getBoundingClientRect(); return box.width && box.height && box.top < innerHeight && box.bottom > 0; }).every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  };
  try {
    await page.goto("/app/new"); await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Acceso privado" })).toBeVisible();
    await accessible(page);
    await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
    if (testInfo.project.name === "mobile-390") {
      await page.getByLabel("Usuario", { exact: true }).fill("nadie@example.invalid"); await page.getByLabel("Contraseña", { exact: true }).fill("invalid-test-password");
      await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.locator(".alert")).toContainText("Usuario o contraseña incorrectos");
    }
    await loginWithTemporaryAccount(page);
    await page.goto("/login"); await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("link", { name: "Nuevo trabajo", exact: true }).click();
    await page.getByLabel("Vehículo o trabajo").fill(name); await page.getByLabel("Fecha del trabajo").fill("2026-10-06"); await page.getByLabel("Código de pintura").fill("PRIVATE-QA-197");
    const sourcePhoto = resolve("assets/demo/mercedes-clase-e/mercedes-clase-e-02-process-side.webp");
    if (testInfo.project.name === "desktop-1440") {
      await page.getByLabel("Añadir fotografías").setInputFiles({ name: "qa-mercedes.jpg", mimeType: "image/jpeg", buffer: await sharp(sourcePhoto).jpeg().toBuffer() });
    } else {
      await page.getByLabel("Añadir fotografías").setInputFiles(testInfo.project.name === "mobile-390" ? [sourcePhoto, resolve("assets/demo/audi-a3-llantas/audi-a3-llanta-02-detail.webp")] : sourcePhoto);
      if (testInfo.project.name === "mobile-390") await page.getByRole("button", { name: "Eliminar foto 2", exact: true }).click();
    }
    await expect(page.getByRole("checkbox", { name: /Publicar en portfolio/ })).not.toBeChecked();
    await page.screenshot({ path: testInfo.outputPath("new.png"), fullPage: true });
    await accessible(page);
    if (testInfo.project.name === "mobile-390") {
      await page.route("**/app/api/jobs/*/photos/*", (route) => route.abort(), { times: 1 });
      await page.getByRole("button", { name: "Guardar trabajo", exact: true }).click();
      await expect(page.locator(".alert")).toContainText("guardado como privado");
      await page.unroute("**/app/api/jobs/*/photos/*");
    }
    await page.getByRole("button", { name: "Guardar trabajo", exact: true }).click(); await page.waitForURL(/\/app\/jobs\/[a-f0-9-]+$/);
    jobId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible(); await expect(page.getByText("PRIVATE-QA-197", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ampliar fotografía$/ })).toBeVisible();
    await page.getByRole("button", { name: /Ampliar fotografía$/ }).focus(); await page.keyboard.press("Enter"); await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.waitForLoadState("networkidle"); await layoutCheck(); await page.screenshot({ path: testInfo.outputPath("detail.png"), fullPage: true });
    await accessible(page);
    await page.getByRole("link", { name: "Trabajos", exact: true }).click(); await expect(page.getByRole("heading", { name, exact: true })).toBeVisible(); await page.waitForLoadState("networkidle"); await layoutCheck(); await page.screenshot({ path: testInfo.outputPath("list.png"), fullPage: true });
    await accessible(page);
    await page.getByRole("link", { name: new RegExp(name) }).click(); await page.getByRole("link", { name: "Editar trabajo" }).click();
    await page.getByLabel("Vehículo o trabajo").fill(`${name} editado`);
    // Derivado técnico de QA en memoria: fotografía real horizontal, originales intactos.
    const landscape = await sharp(resolve("assets/demo/audi-a3-llantas/audi-a3-llanta-02-detail.webp")).resize(1200, 800, { fit: "cover" }).png().toBuffer();
    await page.getByLabel("Añadir fotografías").setInputFiles({ name: "qa-landscape.png", mimeType: "image/png", buffer: landscape });
    await page.getByRole("checkbox", { name: /Publicar en portfolio/ }).check(); await page.screenshot({ path: testInfo.outputPath("edit.png"), fullPage: true });
    await accessible(page);
    await page.getByRole("button", { name: "Guardar trabajo", exact: true }).click(); await page.waitForURL(/\/app\/jobs\/[a-f0-9-]+$/);
    await expect(page.getByText("Publicado", { exact: true }).first()).toBeVisible(); await expect(page.getByRole("button", { name: "Ver fotografía 2", exact: true })).toBeVisible();
    const rpc = await anon.rpc("list_public_jobs"); const publicJob = rpc.data?.find((job: { id: string }) => job.id === jobId);
    expect(Object.keys(publicJob).sort()).toEqual(["id", "job_date", "media", "name"]); expect(publicJob.media).toHaveLength(2); expect(publicJob.paint_code).toBeUndefined();
    const derivedPath = publicJob.media[0].path;
    expect((await anon.storage.from("portfolio-derivatives").download(derivedPath)).error).toBeNull();
    // Nuestro endpoint privado tampoco permite acceder a un trabajo ajeno.
    if (testInfo.project.name === "mobile-390") {
      const otherContext = await browser.newContext(); const other = await otherContext.newPage();
      try {
        await other.goto(`${origin}/login`); await loginWithTemporaryAccount(other, "B");
        const forbidden = await other.evaluate(async (id) => (await fetch(`/app/api/jobs/${id}`, { method: "DELETE" })).status, jobId); expect(forbidden).toBe(404);
        await other.goto(`${origin}/app/jobs/${jobId}`); await expect(other.getByRole("heading", { name: "Trabajo no encontrado" })).toBeVisible(); await expect(other.getByRole("heading", { name: `${name} editado`, exact: true })).toHaveCount(0);
        await other.goto(`${origin}/app`); await other.getByRole("button", { name: "Cerrar sesión" }).click(); await other.waitForURL("**/login");
      } finally { await otherContext.close(); }
    }
    await page.getByRole("link", { name: "Editar trabajo" }).click(); await page.getByRole("button", { name: "Eliminar foto 1", exact: true }).click(); await page.getByRole("checkbox", { name: /Publicar en portfolio/ }).uncheck();
    await page.getByRole("button", { name: "Guardar trabajo", exact: true }).click(); await page.waitForURL(/\/app\/jobs\/[a-f0-9-]+$/);
    await expect(page.getByText("Privado", { exact: true }).first()).toBeVisible(); await expect(page.getByRole("button", { name: "Ver fotografía 2", exact: true })).toHaveCount(0);
    expect((await anon.storage.from("portfolio-derivatives").download(derivedPath)).error).not.toBeNull(); expect((await anon.rpc("list_public_jobs")).data.some((job: { id: string }) => job.id === jobId)).toBe(false);
    await page.getByRole("button", { name: "Eliminar trabajo", exact: true }).click(); await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(page.getByRole("heading", { name: `${name} editado`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar trabajo", exact: true }).click(); await page.getByRole("button", { name: "Sí, eliminar trabajo", exact: true }).click(); await page.waitForURL("**/app");
    await expect(page.getByRole("heading", { name: `${name} editado`, exact: true })).toHaveCount(0); jobId = "";
    await page.getByRole("button", { name: "Cerrar sesión" }).click(); await page.waitForURL("**/login");
    await page.goto("/app"); await expect(page).toHaveURL(/\/login$/);
    expect(failures).toEqual([]);
  } finally {
    if (jobId) {
      const cleanup = await page.evaluate(async (id) => (await fetch(`/app/api/jobs/${id}`, { method: "DELETE", redirect: "manual" })).status, jobId);
      if (cleanup !== 200 && cleanup !== 404) throw new Error("QA dejó un trabajo temporal; conservar datos y reintentar su eliminación con A");
    }
  }
});
