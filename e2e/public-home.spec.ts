import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Solo lecturas públicas: no cuentas, fixtures ni mutaciones en Supabase. No depende de los nombres de los trabajos.
const live = (page: Page) => page.locator('.portfolio-page[data-motion="live"]');
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
async function scrollThrough(page: Page) {
  for (let step = 0; step < 120; step++) {
    const done = await page.evaluate(() => { scrollBy({ top: innerHeight * 0.5, behavior: "instant" }); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; });
    await page.waitForTimeout(120);
    if (done) break;
  }
}

test("portada: titular, abanico de trabajos que lleva a su banda y sin login ni manifest", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Chapa y pintura." })).toBeVisible();
  const fan = page.getByRole("navigation", { name: "Trabajos en portada" });
  const link = fan.getByRole("link").first(); // el nav no ocupa caja: las cartas cuelgan de él
  await expect(link).toBeVisible();
  const target = (await link.getAttribute("href"))!;
  expect(target).toMatch(/^#trabajo-[0-9a-f-]{36}$/);
  await expect(page.locator(target)).toHaveCount(1);
  await expect(page.locator("a[href*='login']")).toHaveCount(0);
  await expect(page.locator("link[rel='manifest']")).toHaveCount(0);
  expect(await noOverflow(page)).toBe(true);
});

test("Antes/Después: dos pantallas rotuladas con la pareja elegida y «Ver fotos» abre el visor en el Después", async ({ page }) => {
  await page.goto("/");
  const pair = page.getByRole("region", { name: /^Antes y después: / });
  test.skip(await pair.count() === 0, "Sin pareja elegida en Portada no hay Antes/Después");
  await expect(pair.locator("figcaption")).toHaveText(["Antes", "Después"]);
  const after = new URL((await pair.locator(".pub-ba-slide-1 img").getAttribute("src"))!, page.url()).pathname;
  await pair.getByRole("button", { name: /^Ver fotos/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(new URL((await dialog.locator(".pub-viewer-slide[data-current] .pub-viewer-full img").getAttribute("src"))!, page.url()).pathname).toBe(after);
  await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0);
});

test("movimiento: la portada y el Antes/Después avanzan con el scroll y cada foto acaba destapada", async ({ page }) => {
  await page.goto("/");
  await expect(live(page)).toHaveCount(1);
  const open = () => page.locator(".pub-hero").evaluate((hero) => Number(getComputedStyle(hero).getPropertyValue("--p") || 0));
  await page.evaluate(() => scrollTo({ top: innerHeight * 0.6, behavior: "instant" }));
  await expect.poll(open).toBeGreaterThan(0.3);
  const pair = page.locator(".pub-ba");
  if (await pair.count()) {
    await page.evaluate(() => { const section = document.querySelector<HTMLElement>(".pub-ba")!; scrollTo({ top: section.offsetTop + section.offsetHeight - innerHeight, behavior: "instant" }); });
    await expect.poll(() => pair.evaluate((section) => Number(getComputedStyle(section).getPropertyValue("--x") || 0))).toBe(1);
  }
  await scrollThrough(page);
  const tiles = await page.locator(".pub-tile").evaluateAll((items) => items.map((tile) => getComputedStyle(tile).getPropertyValue("--t")));
  expect(tiles.length).toBeGreaterThan(0);
  for (const value of tiles) expect(Number(value)).toBe(1);
  expect(await noOverflow(page)).toBe(true);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("nada se fija ni se anima: todo visible, Antes y Después apilados", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(live(page)).toHaveCount(0);
    const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length);
    expect(running).toBe(0);
    await expect(page.locator(".pub-hint")).toBeHidden(); // la pista del abanico solo tiene sentido con movimiento
    const pair = page.locator(".pub-ba-slide");
    if (await pair.count()) {
      const [before, after] = await pair.evaluateAll((slides) => slides.map((slide) => slide.getBoundingClientRect().top + scrollY));
      expect(after).toBeGreaterThan(before); // una debajo de otra, no en horizontal
    }
    await scrollThrough(page);
    const hidden = await page.locator(".pub-tile").evaluateAll((tiles) => tiles.filter((tile) => getComputedStyle(tile, "::after").content !== "none").length);
    expect(hidden).toBe(0);
    expect(await noOverflow(page)).toBe(true);
  });
});

test("botón flotante de WhatsApp: redondo abajo a la derecha, oculto en portada, contacto y con el visor abierto", async ({ page }) => {
  await page.goto("/");
  const fab = page.locator(".pub-fab");
  if (await fab.count() === 0) {
    await expect(page.getByText("Nuestro contacto por WhatsApp estará disponible próximamente.")).toBeVisible();
    return;
  }
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // contenido ya revelado (streaming)
  await expect(fab).toBeHidden();
  await expect(fab).toHaveAttribute("href", /^https:\/\/wa\.me\//); await expect(fab).toHaveAttribute("rel", "noopener noreferrer");
  await page.evaluate(() => document.querySelector("article.pub-work")!.scrollIntoView({ behavior: "instant" }));
  await expect(fab).toBeVisible();
  await expect(fab).toHaveAccessibleName("Escríbenos por WhatsApp (abre WhatsApp en otra pestaña)");
  await page.waitForTimeout(500);
  const box = (await fab.boundingBox())!, viewport = page.viewportSize()!;
  expect(Math.abs(box.width - box.height)).toBeLessThan(1); expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.x + box.width).toBeGreaterThan(viewport.width - 60); expect(box.y + box.height).toBeGreaterThan(viewport.height - 60);
  await page.locator(".pub-tile").first().getByRole("button").focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(fab).toBeHidden();
  await page.keyboard.press("Escape"); await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(fab).toBeHidden();
});
