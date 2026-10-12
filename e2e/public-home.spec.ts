import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Solo lecturas públicas: no cuentas, fixtures ni mutaciones en Supabase. No depende de los nombres de los trabajos.
const live = (page: Page) => page.locator(".portfolio-page[data-motion]"); // «scroll» (CSS) o «js» (respaldo)
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
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible(); // la página ya salió del estado de carga en streaming
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

test("movimiento: en escritorio el abanico se abre con el scroll, el Antes/Después pasa al Después y cada foto acaba destapada", async ({ page }) => {
  await page.goto("/");
  await expect(live(page)).toHaveCount(1);
  const desktop = page.viewportSize()!.width >= 1100;
  await expect(page.locator(".pub-cue")).toBeVisible({ visible: desktop }); // el indicador de scroll solo acompaña al abanico de escritorio
  if (desktop) {
    await page.waitForTimeout(2000); // reparto de cartas terminado
    const edge = () => page.locator(".pub-card").last().evaluate((card) => Math.abs(parseFloat(getComputedStyle(card).rotate) || 0));
    const closed = await edge();
    await page.evaluate(() => { const hero = document.querySelector<HTMLElement>(".pub-hero")!; scrollTo({ top: hero.offsetTop + hero.offsetHeight - innerHeight, behavior: "instant" }); });
    await expect.poll(edge).toBeGreaterThan(closed + 10);
  }
  const pair = page.locator(".pub-ba");
  if (await pair.count()) {
    await page.evaluate(() => { const section = document.querySelector<HTMLElement>(".pub-ba")!; scrollTo({ top: section.offsetTop + section.offsetHeight - innerHeight, behavior: "instant" }); });
    // La pista avanza una pantalla entera: el Después queda delante.
    await expect.poll(() => page.locator(".pub-ba-track").evaluate((track) => Math.round(new DOMMatrix(getComputedStyle(track).transform).m41 + track.parentElement!.clientWidth))).toBe(0);
  }
  await scrollThrough(page);
  const covers = await page.locator(".pub-tile").evaluateAll((tiles) => tiles.map((tile) => { const cover = getComputedStyle(tile, "::after"); return cover.content === "none" || new DOMMatrix(cover.transform).m42 >= tile.clientHeight; }));
  expect(covers.length).toBeGreaterThan(0);
  expect(covers.every(Boolean)).toBe(true);
  expect(await noOverflow(page)).toBe(true);
});

test("abanico en móvil y tablet: carrusel que encaja carta a carta con botones, teclado y contador", async ({ page }) => {
  test.skip(page.viewportSize()!.width >= 1100, "En escritorio es el abanico que se abre con el scroll");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const fan = page.getByRole("navigation", { name: "Trabajos en portada" });
  const count = page.locator(".pub-fan-count");
  const total = await fan.locator(".pub-card").count();
  test.skip(total < 2, "Con una sola carta no hay nada que pasar");
  await expect(count).toHaveText(`Carta 1 / de ${total}`);
  const centred = () => fan.evaluate((track) => { const box = track.getBoundingClientRect(), centre = box.left + box.width / 2; return [...track.querySelectorAll(".pub-card")].findIndex((card) => { const b = card.getBoundingClientRect(); return Math.abs((b.left + b.right) / 2 - centre) < 4; }); });
  await expect(page.getByRole("button", { name: "Carta anterior" })).toBeDisabled();
  await page.getByRole("button", { name: "Carta siguiente" }).click();
  await expect(count).toHaveText(`Carta 2 / de ${total}`);
  await expect.poll(centred).toBe(1);
  await fan.getByRole("link").first().focus();
  await page.keyboard.press("ArrowLeft");
  await expect(count).toHaveText(`Carta 1 / de ${total}`);
  await expect.poll(centred).toBe(0);
  // La carta centrada va recta y la vecina, inclinada asomando por el lado.
  const tilt = () => fan.locator(".pub-card-body").evaluateAll((bodies) => bodies.slice(0, 2).map((body) => Math.round(Math.abs(parseFloat(getComputedStyle(body).rotate) || 0))));
  await expect.poll(tilt).toEqual([0, 12]);
  expect(await fan.evaluate((track) => getComputedStyle(track).overflowY)).toBe("hidden"); // no se queda con el gesto vertical
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
    await expect(page.locator(".pub-cue")).toBeHidden(); // el indicador de scroll solo existe con movimiento
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
