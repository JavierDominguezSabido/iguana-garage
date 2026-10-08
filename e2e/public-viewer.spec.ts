import { expect, test } from "@playwright/test";
import type { CDPSession, Locator, Page } from "@playwright/test";

// Solo lecturas públicas. Visor con tira: foto actual + vecinas montadas, arrastre que sigue al dedo, marcador difuminado
// mientras carga, fallo con reintento y movimiento reducido. Una sola pasada: cada test carga la home una vez.
const CURRENT = ".pub-viewer-slide[data-current]";

async function throttle(page: Page, { cpu = 4, slowNetwork = true } = {}) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  if (slowNetwork) {
    await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  }
}
// Abre el visor desde el primer trabajo con al menos `min` fotos; devuelve los ids de sus fotos y el trabajo.
async function openViewer(page: Page, min = 3) {
  await page.goto("/");
  const work = page.locator("article.pub-work").filter({ has: page.locator(`.pub-wall > .pub-tile:nth-child(${min})`) }).first();
  test.skip(await work.count() === 0, `Hace falta un trabajo con al menos ${min} fotos`);
  const tiles = work.locator(".pub-tile");
  const total = await tiles.count();
  const sources = await tiles.locator("img").evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
  const parsed = sources.map((source) => new URL(source).pathname.split("/").slice(-2));
  await tiles.first().scrollIntoViewIfNeeded();
  return { total, job: parsed[0][0], media: parsed.map((entry) => entry[1]), open: async () => { await tiles.first().getByRole("button").click(); const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible(); return dialog; } };
}
const count = (dialog: Locator) => dialog.locator(".pub-viewer-count");
const ready = (dialog: Locator) => expect.poll(() => dialog.locator(".pub-viewer-slide[data-state=ready]").count(), { timeout: 30000 });
const translateOf = (dialog: Locator, selector: string) => dialog.locator(selector).evaluate((slide) => new DOMMatrixReadOnly(getComputedStyle(slide).transform).m41);

async function touch(cdp: CDPSession, type: "touchStart" | "touchMove" | "touchEnd", x?: number, y?: number) {
  await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: x!, y: y!, id: 1 }] });
}
async function drag(page: Page, cdp: CDPSession, from: { x: number; y: number }, dx: number, { steps, pause, release = true }: { steps: number; pause: number; release?: boolean }) {
  await touch(cdp, "touchStart", from.x, from.y);
  for (let step = 1; step <= steps; step++) { await touch(cdp, "touchMove", from.x + (dx * step) / steps, from.y); if (pause) await page.waitForTimeout(pause); }
  if (release) await touch(cdp, "touchEnd");
}

test("tira: solo se montan la foto actual y sus vecinas, ya cargadas, y no se precargan todas las del trabajo", async ({ page }) => {
  const viewer = await openViewer(page, 4);
  const requested = new Set<string>();
  page.on("request", (request) => { const url = new URL(request.url()); const [job, media] = url.pathname.split("/").slice(-2); if (url.pathname.startsWith("/api/portfolio/photos/") && job === viewer.job && Number(url.searchParams.get("w")) > 320) requested.add(media); });
  const dialog = await viewer.open();
  await expect(dialog.locator(".pub-viewer-slide")).toHaveCount(3);
  await ready(dialog).toBe(3); // actual + anterior + siguiente, cargadas y decodificadas antes de deslizar
  expect(requested.size).toBeLessThanOrEqual(3); expect(requested.size).toBeLessThan(viewer.total);
  await expect(dialog.locator(`${CURRENT}[data-state=ready] .pub-viewer-full`)).toHaveCSS("opacity", "1");
});

test("teclado y flechas: transición corta y la foto nueva ya está lista al llegar", async ({ page }) => {
  const viewer = await openViewer(page);
  const dialog = await viewer.open();
  await ready(dialog).toBe(3);
  const before = Date.now();
  await page.keyboard.press("ArrowRight");
  await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`);
  expect(Date.now() - before).toBeLessThan(900);
  await expect(dialog.locator(`${CURRENT}`)).toHaveAttribute("data-state", "ready", { timeout: 500 });
  await expect(dialog.locator(`${CURRENT} .pub-viewer-full`)).toHaveCSS("opacity", "1");
  await expect.poll(() => dialog.locator(".pub-viewer-track").getAttribute("data-animating")).toBeNull(); // terminó el encaje
  expect(await translateOf(dialog, CURRENT)).toBe(0);
  await dialog.getByRole("button", { name: "Fotografía anterior", exact: true }).click();
  await expect(count(dialog)).toHaveText(`1 / ${viewer.total}`);
  expect(await dialog.locator(".pub-viewer-slide").count()).toBe(3); // la ventana de tres sigue a la foto actual
});

test("táctil: la tira sigue al dedo, encaja al soltar y vuelve si no llega al umbral", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Gestos táctiles reales solo en el proyecto móvil");
  const viewer = await openViewer(page);
  const dialog = await viewer.open();
  await ready(dialog).toBe(3);
  const cdp = await page.context().newCDPSession(page);
  const box = (await dialog.locator(".pub-viewer-stage").boundingBox())!;
  const from = { x: box.x + box.width * 0.7, y: box.y + box.height / 2 };
  // 1) Arrastre sin soltar: la foto actual sigue al dedo y la siguiente asoma por la derecha.
  await drag(page, cdp, from, -120, { steps: 10, pause: 16, release: false });
  expect(Math.abs((await translateOf(dialog, CURRENT)) + 120)).toBeLessThan(4);
  expect(Math.abs((await translateOf(dialog, ".pub-viewer-slide:not([data-current])[style*='--o: 1']")) - (box.width - 120))).toBeLessThan(4);
  await expect(count(dialog)).toHaveText(`1 / ${viewer.total}`); // aún no ha cambiado
  await touch(cdp, "touchEnd");
  await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`); // supera el umbral: encaja en la siguiente
  await expect.poll(() => translateOf(dialog, CURRENT)).toBe(0);
  // 2) Recorrido corto y lento: no llega al umbral, vuelve a su sitio.
  await drag(page, cdp, from, -30, { steps: 12, pause: 24 });
  await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`);
  await expect.poll(() => translateOf(dialog, CURRENT)).toBe(0);
  // 3) Gesto rápido (flick) con poco recorrido: encaja por velocidad.
  await drag(page, cdp, from, -45, { steps: 3, pause: 0 });
  await expect(count(dialog)).toHaveText(`3 / ${viewer.total}`);
  // 4) Gesto vertical y toque: no cambian de foto ni desplazan la tira.
  await touch(cdp, "touchStart", from.x, from.y + 100);
  await touch(cdp, "touchMove", from.x + 6, from.y - 120); await touch(cdp, "touchEnd");
  await page.touchscreen.tap(from.x, from.y);
  await expect(count(dialog)).toHaveText(`3 / ${viewer.total}`);
  expect(await translateOf(dialog, CURRENT)).toBe(0);
});

test("4G lenta y CPU ×4: si la foto nueva no está lista se ve al instante su miniatura difuminada y se funde a la buena", async ({ page }) => {
  const viewer = await openViewer(page);
  let delayed = false;
  await page.route("**/api/portfolio/photos/**", async (route) => {
    if (delayed && Number(new URL(route.request().url()).searchParams.get("w")) > 320) await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  await throttle(page);
  delayed = true; // las fotos grandes (w > 320) tardan 4 s más; las miniaturas (w=320) no
  const dialog = await viewer.open();
  await expect.poll(() => dialog.locator(".pub-viewer-thumbs img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)), { timeout: 30000 }).toBe(true);
  await page.keyboard.press("ArrowRight");
  await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`);
  // Al instante: marcador cargado, ampliado y difuminado; la foto buena aún invisible; y es la de la nueva posición, no la anterior.
  const state = await dialog.locator(CURRENT).evaluate((slide) => {
    const placeholder = slide.querySelector<HTMLImageElement>(".pub-viewer-ph img")!, full = slide.querySelector<HTMLElement>(".pub-viewer-full")!;
    const box = slide.getBoundingClientRect(), centre = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { status: slide.getAttribute("data-state"), placeholderLoaded: placeholder.complete && placeholder.naturalWidth > 0, blur: getComputedStyle(placeholder).filter, fit: getComputedStyle(placeholder).objectFit, placeholderOpacity: getComputedStyle(placeholder.parentElement!).opacity, fullOpacity: getComputedStyle(full).opacity, centreInCurrent: !!centre?.closest(".pub-viewer-slide[data-current]") };
  });
  expect(state).toMatchObject({ status: "loading", placeholderLoaded: true, fit: "contain", placeholderOpacity: "1", fullOpacity: "0", centreInCurrent: true });
  expect(state.blur).toContain("blur");
  // Al cargar y decodificar: fundido a la foto buena y el marcador se retira.
  await expect(dialog.locator(CURRENT)).toHaveAttribute("data-state", "ready", { timeout: 40000 });
  await expect(dialog.locator(`${CURRENT} .pub-viewer-full`)).toHaveCSS("opacity", "1");
  await expect(dialog.locator(`${CURRENT} .pub-viewer-ph`)).toHaveCSS("opacity", "0");
  await page.screenshot({ path: test.info().outputPath("viewer-ready.png") });
});

test("si la foto falla se avisa y se puede reintentar; mientras, sigue viéndose su miniatura", async ({ page }) => {
  const viewer = await openViewer(page);
  let broken = true;
  await page.route("**/api/portfolio/photos/**", async (route) => {
    const url = new URL(route.request().url());
    if (broken && url.pathname.endsWith(`/${viewer.media[1]}`) && Number(url.searchParams.get("w")) > 320) return route.fulfill({ status: 503, body: "No disponible", contentType: "text/plain" });
    await route.continue();
  });
  const dialog = await viewer.open();
  await ready(dialog).toBeGreaterThanOrEqual(2);
  await page.keyboard.press("ArrowRight");
  await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`);
  await expect(dialog.locator(`${CURRENT} .pub-viewer-failed`)).toContainText("Fotografía no disponible.");
  await expect(dialog.locator(`${CURRENT} .pub-viewer-ph`)).toHaveCSS("opacity", "1");
  broken = false;
  await dialog.locator(`${CURRENT}`).getByRole("button", { name: "Reintentar foto", exact: true }).click();
  await expect(dialog.locator(CURRENT)).toHaveAttribute("data-state", "ready", { timeout: 30000 });
  await expect(dialog.locator(`${CURRENT} .pub-viewer-failed`)).toHaveCount(0);
});

test.describe("con movimiento reducido", () => {
  test.use({ reducedMotion: "reduce" });
  test("el cambio de foto es instantáneo: sin transición ni fundido", async ({ page }) => {
    const viewer = await openViewer(page);
    const dialog = await viewer.open();
    await ready(dialog).toBe(3);
    await page.keyboard.press("ArrowRight");
    await expect(count(dialog)).toHaveText(`2 / ${viewer.total}`);
    expect(await dialog.locator(".pub-viewer-track").getAttribute("data-animating")).toBeNull();
    const durations = await dialog.locator(CURRENT).evaluate((slide) => [getComputedStyle(slide).transitionDuration, getComputedStyle(slide.querySelector(".pub-viewer-full")!).transitionDuration, getComputedStyle(slide.querySelector(".pub-viewer-ph")!).transitionDuration]);
    expect(durations).toEqual(["0s", "0s", "0s"]);
    expect(await translateOf(dialog, CURRENT)).toBe(0);
  });
});
