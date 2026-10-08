import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Solo lecturas públicas. Cubre el pulido de la home: botón fijo, gestos del visor, imagen para compartir,
// animación del título, pasada de pintura de las fotos y el botón «Ver fotos».

// Dedo real por CDP (touchStart/Move/End), como en public-transformation.spec.ts.
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const steps = 12;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, id: 1 }] });
  for (let step = 1; step <= steps; step++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(400);
}
async function recordAnimations(page: Page) {
  await page.addInitScript(() => {
    const starts: string[] = []; (window as unknown as { __starts: string[] }).__starts = starts;
    document.addEventListener("animationstart", (event) => starts.push((event as AnimationEvent).animationName), true);
  });
}
const starts = (page: Page, name: string) => page.evaluate((value) => (window as unknown as { __starts: string[] }).__starts.filter((item) => item === value).length, name);
async function scrollThrough(page: Page) {
  for (let step = 0; step < 80; step++) {
    const done = await page.evaluate(() => { scrollBy(0, innerHeight * 0.5); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; });
    await page.waitForTimeout(140);
    if (done) break;
  }
}

test("móvil: el botón fijo de WhatsApp aparece al salir el título y no tapa el final ni el visor", async ({ page, isMobile }) => {
  await page.goto("/");
  const sticky = page.locator(".pub-sticky");
  test.skip(await sticky.count() === 0, "Sin número de WhatsApp válido no hay botón fijo");
  if (!isMobile) { await expect(sticky).toBeHidden(); return; }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(sticky).toBeHidden();
  await page.evaluate(() => scrollTo(0, 60)); await page.waitForTimeout(300);
  await expect(sticky).toBeHidden(); // el título aún se ve
  await page.evaluate(() => scrollTo(0, 1100));
  await expect(sticky).toBeVisible();
  await page.waitForTimeout(400); // deja terminar su transición de entrada
  const box = (await sticky.boundingBox())!, viewport = page.viewportSize()!;
  expect(box.height).toBeGreaterThanOrEqual(44); expect(box.x).toBeGreaterThanOrEqual(8); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 8);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  await expect(sticky).toHaveAttribute("href", /^https:\/\/wa\.me\//); await expect(sticky).toHaveAttribute("rel", "noopener noreferrer");
  // Con el visor abierto no se ve ni se puede pulsar.
  await page.locator(".pub-tile").first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(sticky).toBeHidden();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0); await expect(sticky).toBeVisible();
  // Al llegar a contacto y al pie se retira: el contenido final queda libre.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(sticky).toBeHidden();
  const footerLink = (await page.locator(".pub-footer .pub-text-action").boundingBox())!;
  expect(footerLink.y + footerLink.height).toBeLessThanOrEqual(viewport.height);
});

test("móvil: en el visor, deslizar a izquierda y derecha cambia de foto sin romper el scroll vertical", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Gestos táctiles reales solo en el proyecto móvil");
  await page.goto("/");
  const work = page.locator("article.pub-work").filter({ has: page.locator(".pub-tile + .pub-tile") }).first();
  await work.locator(".pub-tile").first().scrollIntoViewIfNeeded();
  const total = await work.locator(".pub-tile").count();
  await work.locator(".pub-tile").first().getByRole("button").click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  const photo = (await dialog.locator(".pub-full-photo").boundingBox())!;
  const x = photo.x + photo.width / 2, y = photo.y + photo.height / 2;
  await expect(dialog.getByText(`Fotografía 1 de ${total}`, { exact: true })).toBeVisible();
  await swipe(page, { x: x + 90, y }, { x: x - 90, y: y + 6 });
  await expect(dialog.getByText(`Fotografía 2 de ${total}`, { exact: true })).toBeVisible();
  await swipe(page, { x: x - 90, y }, { x: x + 90, y: y - 6 });
  await expect(dialog.getByText(`Fotografía 1 de ${total}`, { exact: true })).toBeVisible();
  await swipe(page, { x: x - 90, y }, { x: x + 90, y });
  await expect(dialog.getByText(`Fotografía ${total} de ${total}`, { exact: true })).toBeVisible();
  await swipe(page, { x, y: y + 80 }, { x: x + 10, y: y - 80 }); // gesto vertical: no cambia
  await expect(dialog.getByText(`Fotografía ${total} de ${total}`, { exact: true })).toBeVisible();
  await swipe(page, { x: x + 20, y }, { x: x - 10, y }); // recorrido corto: no cambia
  await expect(dialog.getByText(`Fotografía ${total} de ${total}`, { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Siguiente →", exact: true }).click(); // los botones siguen funcionando
  await expect(dialog.getByText(`Fotografía 1 de ${total}`, { exact: true })).toBeVisible();
});

test("compartir: imagen Open Graph estática de marca, 1200×630, enlazada con URL absoluta", async ({ page }) => {
  await page.goto("/");
  const meta = (property: string) => page.locator(`meta[property="${property}"],meta[name="${property}"]`).first().getAttribute("content");
  const image = (await meta("og:image"))!;
  expect(new URL(image).pathname).toBe("/share/iguana-garage-og.png");
  expect(await meta("og:image:width")).toBe("1200"); expect(await meta("og:image:height")).toBe("630");
  expect(await meta("twitter:card")).toBe("summary_large_image");
  expect(new URL((await meta("twitter:image"))!).pathname).toBe("/share/iguana-garage-og.png");
  expect(image).not.toContain("/api/portfolio/");
  const response = await page.request.get("/share/iguana-garage-og.png");
  expect(response.status()).toBe(200); expect(response.headers()["content-type"]).toContain("image/png");
  const body = await response.body();
  expect(body.subarray(1, 4).toString()).toBe("PNG");
  expect(body.readUInt32BE(16)).toBe(1200); expect(body.readUInt32BE(20)).toBe(630);
});

test("título: las dos líneas suben escalonadas una sola vez al cargar", async ({ page }) => {
  await recordAnimations(page);
  await page.goto("/");
  await page.waitForTimeout(1400);
  expect(await starts(page, "pub-rise")).toBe(2);
  const running = await page.evaluate(() => [...document.querySelectorAll(".pub-hero > h1 > span")].flatMap((line) => line.getAnimations()).filter((animation) => animation.playState === "running").length);
  expect(running).toBe(0);
  await page.evaluate(() => scrollTo(0, 600)); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  expect(await starts(page, "pub-rise")).toBe(2);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("ni el título ni las fotos se animan", async ({ page }) => {
    await recordAnimations(page);
    await page.goto("/");
    await scrollThrough(page);
    for (const name of ["pub-rise", "pub-paint-window", "pub-paint-photo", "pub-paint-stripe"]) expect(await starts(page, name)).toBe(0);
    await expect(page.locator("[data-hidden]")).toHaveCount(0);
  });
});

test("fotos del muro: una franja verde las recorre y las descubre una sola vez, sin fundido", async ({ page }) => {
  await recordAnimations(page);
  await page.goto("/");
  await expect(page.locator(".pub-tile").first()).toBeAttached();
  await expect(page.locator(".pub-tile[data-reveal]")).toHaveCount(0); // sustituye a la entrada anterior, no se suma
  await expect.poll(() => page.locator(".pub-tile[data-hidden]").count()).toBeGreaterThan(0); // tras hidratar
  const hidden = await page.locator(".pub-tile[data-hidden]").count();
  await scrollThrough(page);
  await expect.poll(() => page.locator(".pub-tile[data-hidden]").count(), { timeout: 5000 }).toBe(0);
  await page.waitForTimeout(1200);
  const swept = await page.locator(".pub-tile[data-sweep]").count();
  expect(swept).toBe(hidden);
  expect(await starts(page, "pub-paint-window")).toBe(swept);
  expect(await starts(page, "pub-paint-photo")).toBe(swept);
  expect(await starts(page, "pub-paint-stripe")).toBe(swept);
  // Estado final: foto en su sitio, sin transformaciones residuales y sin franja visible.
  const final = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".pub-tile")].map((tile) => {
    const tileBox = tile.getBoundingClientRect(), photo = tile.querySelector<HTMLElement>(".pub-paint-photo")!.getBoundingClientRect();
    return { aligned: Math.abs(tileBox.x - photo.x) < 1 && Math.abs(tileBox.width - photo.width) < 1, windowTransform: getComputedStyle(tile.querySelector(".pub-paint")!).transform, photoTransform: getComputedStyle(tile.querySelector(".pub-paint-photo")!).transform, stripe: getComputedStyle(tile.querySelector(".pub-paint-stripe")!).opacity };
  }));
  for (const tile of final) { expect(tile.aligned).toBe(true); expect(tile.windowTransform).toBe("none"); expect(tile.photoTransform).toBe("none"); expect(tile.stripe).toBe("0"); }
  // Una sola vez: volver a pasar no la repite.
  await page.evaluate(() => scrollTo(0, 0)); await scrollThrough(page);
  expect(await starts(page, "pub-paint-window")).toBe(swept);
});

test("«Ver fotos» no sugiere un enlace externo: lleva un icono de fotos y no la flecha ↗", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: /^Ver fotos/ });
  await expect(open).toBeVisible({ timeout: 5000 });
  await expect(open).not.toContainText("↗");
  await expect(open.locator("svg")).toHaveCount(1);
  await expect(open.locator("svg")).toHaveAttribute("aria-hidden", "true");
});
