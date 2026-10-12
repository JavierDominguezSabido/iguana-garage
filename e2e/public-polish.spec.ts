import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Solo lecturas públicas. Cubre el pulido de la home: gestos del visor, imagen para compartir, entrada del titular
// y del abanico, movimiento reducido y el botón «Ver fotos». La composición y el movimiento ligado al scroll están en
// public-home.spec.ts.

// Dedo real por CDP (touchStart/Move/End), como en public-viewer.spec.ts.
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
  for (let step = 0; step < 120; step++) {
    const done = await page.evaluate(() => { scrollBy({ top: innerHeight * 0.5, behavior: "instant" }); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; });
    await page.waitForTimeout(140);
    if (done) break;
  }
}

test("móvil: en el visor, deslizar a izquierda y derecha cambia de foto sin romper el scroll vertical", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Gestos táctiles reales solo en el proyecto móvil");
  await page.goto("/");
  const index = await page.locator("article.pub-work").evaluateAll((works) => works.findIndex((work) => work.querySelectorAll(".pub-tile").length > 1));
  test.skip(index < 0, "Hace falta un trabajo con al menos 2 fotos");
  const work = page.locator("article.pub-work").nth(index);
  const first = work.getByRole("button", { name: /, fotografía 1$/ });
  await first.scrollIntoViewIfNeeded();
  const total = await work.locator(".pub-tile").count();
  await first.focus(); await page.keyboard.press("Enter"); // el paralaje mueve el botón al desplazar: abrir con teclado
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  const photo = (await dialog.locator(".pub-viewer-photo").boundingBox())!;
  const x = photo.x + photo.width / 2, y = photo.y + photo.height / 2;
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`1 / ${total}`);
  await swipe(page, { x: x + 90, y }, { x: x - 90, y: y + 6 });
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`2 / ${total}`);
  await swipe(page, { x: x - 90, y }, { x: x + 90, y: y - 6 });
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`1 / ${total}`);
  await swipe(page, { x: x - 90, y }, { x: x + 90, y });
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`${total} / ${total}`);
  await swipe(page, { x, y: y + 80 }, { x: x + 10, y: y - 80 }); // gesto vertical: no cambia
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`${total} / ${total}`);
  await swipe(page, { x: x + 20, y }, { x: x - 10, y }); // recorrido corto: no cambia
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`${total} / ${total}`);
  await dialog.getByRole("button", { name: "Fotografía siguiente", exact: true }).click(); // los botones siguen funcionando
  await expect(dialog.locator(".pub-viewer-count")).toHaveText(`1 / ${total}`);
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

test("portada: las dos líneas del titular suben y las cartas se reparten una sola vez al cargar", async ({ page }) => {
  await recordAnimations(page);
  await page.goto("/");
  await page.waitForTimeout(2400);
  expect(await starts(page, "pub-up")).toBe(2);
  expect(await starts(page, "pub-deal")).toBe(await page.locator(".pub-card").count());
  const running = await page.evaluate(() => [...document.querySelectorAll(".pub-hero h1 .pub-line > span, .pub-card-body")].flatMap((element) => element.getAnimations()).filter((animation) => animation.playState === "running").length);
  expect(running).toBe(0);
  await page.evaluate(() => scrollTo(0, 600)); await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
  expect(await starts(page, "pub-up")).toBe(2);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("ni el titular, ni las cartas, ni las fotos se animan", async ({ page }) => {
    await recordAnimations(page);
    await page.goto("/");
    await scrollThrough(page);
    for (const name of ["pub-up", "pub-deal", "pub-fade", "pub-grow"]) expect(await starts(page, name)).toBe(0);
    await expect(page.locator("[data-motion]")).toHaveCount(0);
  });
});

test("«Ver fotos» no sugiere un enlace externo: lleva un icono de fotos y no la flecha ↗", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: /^Ver fotos/ }).first();
  await expect(open).toBeAttached({ timeout: 5000 });
  await expect(open).not.toContainText("↗");
  await expect(open.locator("svg")).toHaveCount(1);
  await expect(open.locator("svg")).toHaveAttribute("aria-hidden", "true");
});
