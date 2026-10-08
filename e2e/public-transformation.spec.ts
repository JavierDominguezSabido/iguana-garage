import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// Solo lecturas públicas: no cuentas, fixtures ni mutaciones en Supabase. No depende del nombre del trabajo.
const slider = (page: Page) => page.getByRole("slider", { name: /^Comparador Antes y Después: / });
const sliderValue = async (page: Page) => Number(await slider(page).getAttribute("aria-valuenow"));

test("portada: título y comparador visibles sin scroll, con el comparador junto al título en escritorio y debajo en móvil", async ({ page }) => {
  await page.goto("/");
  await expect(slider(page)).toBeVisible({ timeout: 5000 });
  const viewport = page.viewportSize()!;
  const box = (await slider(page).boundingBox())!;
  const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  await expect(page.getByText("Arrastra para ver el antes y el después", { exact: true })).toBeVisible();
  if (viewport.width < 700) {
    expect(box.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    const open = (await page.getByRole("button", { name: /^Ver fotos/ }).boundingBox())!;
    expect(open.y + open.height).toBeLessThanOrEqual(viewport.height);
  } else {
    expect(box.x).toBeGreaterThanOrEqual(title.x + title.width - 2);
    expect(box.width / viewport.width).toBeGreaterThan(0.4); expect(box.width / viewport.width).toBeLessThan(0.55);
  }
  // El nombre del trabajo es una etiqueta pequeña sobre el comparador, no parte de la frase.
  const tag = (await page.locator(".pub-compare-tag").boundingBox())!;
  expect(tag.y + tag.height).toBeLessThanOrEqual(box.y + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("comparador: teclado (flechas, Re Pág, Inicio, Fin) y ratón, con valor accesible", async ({ page }) => {
  await page.goto("/");
  const control = slider(page);
  await expect(control).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(2600); // deja terminar la pista de uso
  await control.focus();
  const start = await sliderValue(page);
  await page.keyboard.press("ArrowRight"); expect(await sliderValue(page)).toBe(start + 4);
  await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowLeft"); expect(await sliderValue(page)).toBe(start - 4);
  await page.keyboard.press("Home"); const min = await sliderValue(page);
  await page.keyboard.press("End"); const max = await sliderValue(page);
  expect(min).toBeGreaterThan(0); expect(max).toBeLessThan(100); expect(max).toBeGreaterThan(min);
  await expect(control).toHaveAttribute("aria-valuetext", new RegExp(`^Antes ${max} %, Después ${100 - max} %$`));
  const box = (await control.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5); await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5, { steps: 8 }); await page.mouse.up();
  expect(Math.abs(await sliderValue(page) - 30)).toBeLessThan(2);
  await page.mouse.click(box.x + 4, box.y + box.height * 0.5);
  expect(await sliderValue(page)).toBe(min);
  await expect(page.getByRole("dialog")).toHaveCount(0); // tocar o arrastrar no abre el visor
});

test("«Ver fotos» abre el visor del trabajo, centrado y con las fotos completas, y devuelve el foco", async ({ page }) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: /^Ver fotos/ });
  await expect(opener).toBeVisible({ timeout: 5000 });
  await opener.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: /^Fotografías de / });
  await expect(dialog).toBeVisible();
  const photo = dialog.locator(".pub-full-photo img");
  await expect.poll(() => photo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(photo).toHaveCSS("object-fit", "contain");
  const geometry = await dialog.evaluate(element => {
    const r = element.getBoundingClientRect();
    return { x: Math.abs(r.x + r.width / 2 - innerWidth / 2), y: Math.abs(r.y + r.height / 2 - innerHeight / 2), overflow: element.scrollWidth > element.clientWidth };
  });
  expect(geometry.x).toBeLessThan(1); expect(geometry.y).toBeLessThan(1); expect(geometry.overflow).toBe(false);
  await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
});

// Dedo real por CDP (touchStart/Move/End): Input.synthesizeScrollGesture no desplaza la página en este entorno.
async function swipe(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  const cdp = await page.context().newCDPSession(page);
  const steps = 14;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...from, id: 1 }] });
  for (let step = 1; step <= steps; step++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (to.x - from.x) * step / steps, y: from.y + (to.y - from.y) * step / steps, id: 1 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(700);
}

test("móvil: el scroll vertical funciona empezando sobre la foto y el arrastre horizontal mueve la barra sin abrir el visor", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Gestos táctiles reales solo en el proyecto móvil");
  await page.goto("/");
  const control = slider(page);
  await expect(control).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(2600); // deja terminar la pista de uso
  const box = (await control.boundingBox())!;
  const x = box.x + box.width * 0.5, y = box.y + box.height * 0.6;
  const before = await sliderValue(page);
  await swipe(page, { x, y }, { x, y: y - 300 });
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(150);
  expect(Math.abs(await sliderValue(page) - before)).toBeLessThanOrEqual(2);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(200);
  await swipe(page, { x: x + 80, y }, { x: x - 80, y: y + 4 });
  expect(await sliderValue(page)).toBeLessThan(before - 20);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(5);
  await page.touchscreen.tap(x, y);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("pista de uso: la barra se mueve sola una única vez y vuelve al centro", async ({ page }) => {
  await page.goto("/");
  await expect(slider(page)).toBeVisible({ timeout: 5000 });
  const samples: number[] = [];
  for (let step = 0; step < 70; step++) { samples.push(await sliderValue(page)); await page.waitForTimeout(50); }
  expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(6);
  expect(samples.at(-1)).toBe(50);
  const later: number[] = [];
  for (let step = 0; step < 30; step++) { later.push(await sliderValue(page)); await page.waitForTimeout(50); }
  expect(new Set(later).size).toBe(1);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("ni pista de uso ni animaciones de entrada: todo visible y quieto", async ({ page }) => {
    await page.goto("/");
    await expect(slider(page)).toBeVisible({ timeout: 5000 });
    for (let step = 0; step < 40; step++) { expect(await sliderValue(page)).toBe(50); await page.waitForTimeout(50); }
    await expect(page.locator("[data-hidden]")).toHaveCount(0);
  });
});

test("entrada al hacer scroll: el muro se revela al llegar y no queda nada oculto", async ({ page }) => {
  await page.goto("/");
  await expect(slider(page)).toBeVisible({ timeout: 5000 });
  await expect.poll(() => page.locator("[data-hidden]").count()).toBeGreaterThan(0);
  for (let step = 0; step < 60; step++) {
    const done = await page.evaluate(() => { scrollBy(0, innerHeight * 0.6); return scrollY + innerHeight >= document.documentElement.scrollHeight - 2; });
    await page.waitForTimeout(120);
    if (done) break;
  }
  await expect.poll(() => page.locator("[data-hidden]").count(), { timeout: 4000 }).toBe(0);
});
