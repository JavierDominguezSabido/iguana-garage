import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import axe from "axe-core";

async function login(page: Page) {
  try {
    const email = process.env.SUPABASE_TEST_USER_A_EMAIL; const password = process.env.SUPABASE_TEST_USER_A_PASSWORD;
    if (!email || !password) throw new Error();
    await page.goto("/login");
    await page.getByLabel("Usuario", { exact: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/app");
  } catch {
    await page.locator('input[name="email"],input[name="password"]').evaluateAll((inputs) => inputs.forEach((input) => { (input as HTMLInputElement).value = ""; })).catch(() => {});
    throw new Error("Acceso temporal no disponible; no se registran credenciales.");
  }
}
async function audit(page: Page) {
  expect(await page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations)).toEqual([]);
  await page.evaluate((source) => {
    const script = document.createElement("script");
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    script.textContent = source; document.head.append(script);
  }, axe.source);
  expect(await page.evaluate(async () => {
    const scanner = window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string }[] }> } };
    return (await scanner.axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } })).violations.map((issue) => issue.id);
  })).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator("a,button").evaluateAll((elements) => elements.filter((element) => { const box = element.getBoundingClientRect(); return box.width && box.height; }).filter((element) => { const box = element.getBoundingClientRect(); return box.width < 44 || box.height < 44; }).map((element) => element.tagName))).toEqual([]);
}
test("V1: portfolio anónimo, proporciones, publicación/retirada y limpieza", async ({ page, browser }, testInfo) => {
  test.setTimeout(150_000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  if (process.env.SUPABASE_TEST_DISPOSABLE !== "true" || process.env.SUPABASE_TEST_PROJECT_REF !== "atibisongftmspwtyndv" || new URL(url).hostname !== "atibisongftmspwtyndv.supabase.co") throw new Error("QA requiere el proyecto de desarrollo autorizado");
  const owner = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await owner.auth.signInWithPassword({ email: process.env.SUPABASE_TEST_USER_A_EMAIL!, password: process.env.SUPABASE_TEST_USER_A_PASSWORD! });
  if (auth.error || !auth.data.user) throw new Error("Cuenta temporal no disponible; no se registran valores.");
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport, deviceScaleFactor: 1, reducedMotion: "reduce", isMobile: Boolean(testInfo.project.use.isMobile), hasTouch: Boolean(testInfo.project.use.hasTouch) });
  const publicPage = await context.newPage();
  await publicPage.addInitScript(() => {
    (window as unknown as { cspViolations: string[] }).cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { cspViolations: string[] }).cspViolations.push(event.violatedDirective);
    });
    const metrics = { cls: 0, lcp: 0 }; (window as unknown as { iguanaMetrics: typeof metrics }).iguanaMetrics = metrics;
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; } }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) => { metrics.lcp = list.getEntries().at(-1)?.startTime ?? 0; }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const errors: string[] = []; publicPage.on("pageerror", () => errors.push("public-script-error"));
  const pending = new Set<string>(); let jobId = "";
  const name = `QA Portfolio ${randomUUID().slice(0, 8)}`;
  page.on("request", (request) => { if (request.method() === "POST" && new URL(request.url()).pathname === "/app/api/jobs") { const id = request.postDataJSON().id; if (typeof id === "string") { pending.add(id); jobId = id; } } });
  const save = async () => { await page.getByRole("button", { name: "Guardar trabajo", exact: true }).click(); await page.waitForURL(/\/app\/jobs\/[a-f0-9-]+$/); };
  const togglePublication = async (published: boolean) => { await page.getByRole("link", { name: "Editar trabajo" }).click(); await page.getByRole("checkbox", { name: /Publicar en portfolio/ }).setChecked(published); await save(); };
  try {
    const empty = await publicPage.goto("http://127.0.0.1:3100/");
    expect(empty?.status()).toBe(200); await expect(publicPage.getByRole("heading", { name: "Trabajos realizados" })).toBeVisible();
    await expect(publicPage.locator('a[href="/login"],a[href^="/app"]')).toHaveCount(0);
    await expect(publicPage.getByText("Estamos preparando las fotografías de nuestros trabajos.")).toBeVisible();
    await audit(publicPage); await publicPage.screenshot({ path: testInfo.outputPath("public-empty.png"), fullPage: true });
    await publicPage.locator("#contacto").scrollIntoViewIfNeeded(); await expect(publicPage.getByRole("heading", { name: "¿Hablamos de tu coche?" })).toBeVisible();
    if (!process.env.IGUANA_WHATSAPP_NUMBER) await expect(publicPage.locator('a[href^="https://wa.me/"],a[href^="tel:"]')).toHaveCount(0);
    await publicPage.goto("http://127.0.0.1:3100/app"); await expect(publicPage).toHaveURL(/\/login$/);
    expect((await publicPage.request.get("http://127.0.0.1:3100/login")).headers()["x-robots-tag"]).toContain("noindex");
    await login(page); await page.getByRole("link", { name: "Nuevo trabajo", exact: true }).click();
    await page.getByLabel("Vehículo o trabajo").fill(name); await page.getByLabel("Fecha del trabajo").fill("2026-10-06"); await page.getByLabel("Código de pintura").fill("PRIVATE-PORTFOLIO-QA");
    const source = resolve("assets/demo/mercedes-clase-e/mercedes-clase-e-02-process-side.webp");
    const landscape = await sharp(resolve("assets/demo/audi-a3-llantas/audi-a3-llanta-02-detail.webp")).resize(1200, 800, { fit: "cover" }).png().toBuffer();
    const panorama = await sharp(source).resize(1200, 400, { fit: "cover" }).jpeg().toBuffer();
    // Adaptaciones representativas de QA solo en memoria; no reemplazan assets ni originales de la app.
    await page.getByLabel("Añadir fotografías").setInputFiles([{ name: "qa-vertical.webp", mimeType: "image/webp", buffer: await readFile(source) }, { name: "qa-horizontal.png", mimeType: "image/png", buffer: landscape }, { name: "qa-panorama.jpg", mimeType: "image/jpeg", buffer: panorama }]);
    await save(); jobId = new URL(page.url()).pathname.split("/").at(-1)!;
    await publicPage.goto("http://127.0.0.1:3100/"); await expect(publicPage.getByRole("heading", { name, exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Editar trabajo" }).click(); await page.getByLabel("Vehículo o trabajo").fill(`${name} editado`); await page.getByRole("checkbox", { name: /Publicar en portfolio/ }).check(); await save();
    const response = await publicPage.goto("http://127.0.0.1:3100/");
    const html = await response!.text();
    for (const forbidden of ["paint_code", "owner_id", "byte_size", "job-originals", "PRIVATE-PORTFOLIO-QA", auth.data.user.id]) expect(html.includes(forbidden)).toBe(false);
    await expect(publicPage.getByRole("heading", { name: `${name} editado`, exact: true })).toBeVisible();
    await publicPage.waitForLoadState("networkidle");
    // Comprobar el render real antes de capturar: las imágenes lazy fuera de viewport
    // no se pintan solo porque se pida una screenshot de página completa.
    // Hero de texto: la fotografía aparece una sola vez, dentro del portfolio.
    await expect(publicPage.locator(".pub-hero-figure")).toHaveCount(0);
    await expect(publicPage.locator(".pub-hero-figure .pub-photo")).toHaveCount(0);
    await publicPage.locator(".pub-tile").first().scrollIntoViewIfNeeded();
    await expect.poll(() => publicPage.locator(".pub-tile .pub-photo img").first().evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    await publicPage.evaluate(() => scrollTo(0, 0));
    await publicPage.locator(".pub-tile .pub-photo img").evaluateAll(async (images) => { await Promise.all(images.map((image) => (image as HTMLImageElement).decode())); });
    await publicPage.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await testInfo.attach("public-image-layout", { body: JSON.stringify(await publicPage.locator(".pub-tile .pub-photo img").evaluateAll((images) => images.map((image) => { const el = image as HTMLImageElement; const rect = el.getBoundingClientRect(); const css = getComputedStyle(el); const parent = el.parentElement!.getBoundingClientRect(); return { natural: [el.naturalWidth, el.naturalHeight], box: [rect.x, rect.y, rect.width, rect.height], parent: [parent.x, parent.y, parent.width, parent.height], visibility: css.visibility, opacity: css.opacity, objectFit: css.objectFit }; }))), contentType: "application/json" });
    await publicPage.screenshot({ path: testInfo.outputPath("public-viewport.png") });
    await audit(publicPage); await publicPage.screenshot({ path: testInfo.outputPath("public-published.png"), fullPage: true });
    const metrics = await publicPage.evaluate(() => ({ ...(window as unknown as { iguanaMetrics: { cls: number; lcp: number } }).iguanaMetrics, javascriptBytes: performance.getEntriesByType("resource").filter((entry) => entry.name.endsWith(".js")).reduce((total, entry) => total + (entry as PerformanceResourceTiming).encodedBodySize, 0) }));
    expect(metrics.cls).toBeLessThan(0.1); await testInfo.attach("public-performance", { body: JSON.stringify(metrics), contentType: "application/json" });
    const photoButton = publicPage.getByRole("button", { name: `Ampliar ${name} editado, fotografía 1`, exact: true });
    await photoButton.focus(); await publicPage.keyboard.press("Enter"); await expect(publicPage.getByRole("dialog")).toBeVisible();
    await expect(publicPage.getByRole("button", { name: "Cerrar fotografías", exact: true })).toBeFocused();
    await expect(publicPage.locator(".pub-viewer-count")).toHaveText("1 / 3");
    for (let index = 0; index < 3; index++) {
      await expect.poll(() => publicPage.locator(".pub-viewer-slide[data-current] .pub-viewer-full img").evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
      expect(await publicPage.locator(".pub-viewer-slide[data-current] .pub-viewer-full img").evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
      await publicPage.screenshot({ path: testInfo.outputPath(`public-full-${index + 1}.png`) });
      if (index < 2) await publicPage.getByRole("button", { name: "Fotografía siguiente", exact: true }).click();
    }
    await audit(publicPage); await publicPage.keyboard.press("ArrowLeft"); await expect(publicPage.locator(".pub-viewer-count")).toHaveText("2 / 3");
    await publicPage.keyboard.press("Escape"); await expect(publicPage.getByRole("dialog")).not.toBeVisible(); await expect(photoButton).toBeFocused();
    const result = await anon.rpc("list_public_jobs"); const publicJob = result.data.find((job: { id: string }) => job.id === jobId);
    expect(Object.keys(publicJob).sort()).toEqual(["id", "job_date", "media", "name"]);
    const metadata = await owner.from("job_media").select("id,storage_path,width,height").eq("job_id", jobId).order("position");
    expect(metadata.error).toBeNull();
    const publicUrl = `/api/portfolio/photos/${jobId}/${publicJob.media[0].id}?w=390&r=0`;
    for (let index = 0; index < 3; index++) {
      const photo = publicJob.media[index];
      const delivered = await publicPage.request.get(`http://127.0.0.1:3100/api/portfolio/photos/${jobId}/${photo.id}?w=640&r=0`);
      expect(delivered.status()).toBe(200); expect(delivered.headers()["cache-control"]).toContain("no-store");
      const dimensions = await sharp(await delivered.body()).metadata(); const original = metadata.data![index];
      expect(dimensions.width! / dimensions.height!).toBeCloseTo(original.width / original.height, 2); expect(dimensions.width).toBeLessThanOrEqual(640);
      expect((await anon.storage.from("job-originals").download(original.storage_path)).error).not.toBeNull();
    }
    expect((await publicPage.request.get(`http://127.0.0.1:3100/_next/image?url=${encodeURIComponent(publicUrl)}&w=640&q=75`)).status()).toBe(400);
    expect((await publicPage.request.get(`http://127.0.0.1:3100/api/portfolio/photos/${jobId}/${publicJob.media[0].id}?w=390&original=1`)).status()).toBe(404);
    expect((await anon.storage.from("portfolio-derivatives").list(jobId)).data ?? []).toHaveLength(0);
    {
      const mainId = jobId;
      await page.goto("/app/new"); await page.getByLabel("Vehículo o trabajo").fill(`${name} sin fotos`); await page.getByLabel("Fecha del trabajo").fill("2026-10-06"); await page.getByRole("checkbox", { name: /Publicar en portfolio/ }).check(); await save();
      const noPhotoId = jobId;
      await publicPage.goto("http://127.0.0.1:3100/"); await expect(publicPage.locator("article.pub-work")).toHaveCount(2); await expect(publicPage.getByText("Fotografías próximamente")).toBeVisible();
      const composition = await publicPage.evaluate(() => ({ width: innerWidth, overflowX: document.documentElement.scrollWidth > innerWidth, tileRatios: [...document.querySelectorAll(".pub-tile")].map((tile) => { const box = tile.getBoundingClientRect(); return box.width / box.height; }) }));
      expect(composition.overflowX).toBe(false);
      for (const ratio of composition.tileRatios) expect(ratio).toBeCloseTo(4 / 5, 1);
      await testInfo.attach("public-editorial-composition", { body: JSON.stringify(composition), contentType: "application/json" });
      await publicPage.screenshot({ path: testInfo.outputPath("public-multiple.png"), fullPage: true });
      expect(await page.evaluate(async (id) => (await fetch(`/app/api/jobs/${id}`, { method: "DELETE" })).status, noPhotoId)).toBe(200); pending.delete(noPhotoId); jobId = mainId;
      await page.goto(`/app/jobs/${jobId}`);
      await publicPage.route("**/api/portfolio/photos/**", (route) => route.fulfill({ status: 503, body: "Unavailable", contentType: "text/plain" })); await publicPage.goto("http://127.0.0.1:3100/");
      await expect(publicPage.getByText("Fotografía no disponible.", { exact: true }).first()).toBeVisible(); await publicPage.unroute("**/api/portfolio/photos/**");
      const retry = publicPage.getByRole("button", { name: "Reintentar foto", exact: true });
      for (let failed = await retry.count(); failed > 0; failed = await retry.count()) await retry.first().click();
      await expect.poll(() => publicPage.locator(".pub-tile .pub-photo img").evaluateAll((images) => images.length === 3 && images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
      await publicPage.goto("http://127.0.0.1:3100/");
    }
    await togglePublication(false);
    expect((await publicPage.request.get(`http://127.0.0.1:3100${publicUrl}`)).status()).toBe(404);
    await publicPage.goto("http://127.0.0.1:3100/"); await expect(publicPage.getByRole("heading", { name: `${name} editado`, exact: true })).toHaveCount(0);
    await togglePublication(true); await publicPage.goto("http://127.0.0.1:3100/"); await expect(publicPage.getByRole("heading", { name: `${name} editado`, exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Eliminar trabajo", exact: true }).click(); await page.getByRole("button", { name: "Sí, eliminar trabajo", exact: true }).click(); await page.waitForURL("**/app"); pending.delete(jobId);
    expect((await owner.from("job_media").select("id").eq("job_id", jobId)).data).toEqual([]);
    expect((await owner.storage.from("job-originals").list(`${auth.data.user.id}/${jobId}`)).data).toEqual([]);
    await publicPage.goto("http://127.0.0.1:3100/"); await expect(publicPage.getByRole("heading", { name: `${name} editado`, exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Cerrar sesión" }).click(); await page.waitForURL("**/login"); expect(errors).toEqual([]);
  } finally {
    for (const id of pending) {
      const status = await page.evaluate(async (value) => (await fetch(`/app/api/jobs/${value}`, { method: "DELETE", redirect: "manual" })).status, id);
      if (status !== 200 && status !== 404) throw new Error("Fixture temporal pendiente de limpieza; no modificar otros datos.");
    }
    await context.close(); await owner.auth.signOut();
  }
});
