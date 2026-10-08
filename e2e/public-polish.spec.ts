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

async function scrollBack(page: Page) {
  for (let step = 0; step < 80; step++) {
    const done = await page.evaluate(() => { scrollBy(0, -innerHeight * 0.5); return scrollY <= 2; });
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
    for (const name of ["pub-rise", "pub-rise-in", "pub-fade-in", "pub-shimmer"]) expect(await starts(page, name)).toBe(0);
    await expect(page.locator("[data-hidden], [data-wall]")).toHaveCount(0);
  });
});

// Registra cada animación de entrada de una foto y si su imagen ya estaba cargada y decodificada al empezar.
async function recordWallEntries(page: Page) {
  await page.addInitScript(() => {
    type Entry = { name: string; ready: boolean; translates: boolean; detail: string };
    const entries: Entry[] = []; (window as unknown as { __entries: Entry[] }).__entries = entries;
    document.addEventListener("animationstart", (event) => {
      const name = (event as AnimationEvent).animationName;
      if (name !== "pub-rise-in" && name !== "pub-fade-in") return;
      const target = event.target as HTMLElement, image = target.closest(".pub-tile")?.querySelector("img");
      const effect = target.getAnimations().find((animation) => (animation as CSSAnimation).animationName === name)?.effect as KeyframeEffect | null | undefined;
      const keyframes = effect?.getKeyframes() ?? [];
      // «Lista» = cargada y decodificada, o la foto ha fallado y el recuadro ya enseña su aviso (la imagen deja de existir).
      const failed = !!target.closest(".pub-tile")?.querySelector(".pub-photo-failed");
      entries.push({ name, ready: failed || (!!image && image.complete && image.naturalWidth > 0), translates: keyframes.some((frame) => "transform" in frame), detail: JSON.stringify({ hasImg: !!image, complete: image?.complete, width: image?.naturalWidth, failedUi: failed, src: (image?.currentSrc ?? "").slice(-48) }) });
    }, true);
  });
}
const wallEntries = (page: Page) => page.evaluate(() => (window as unknown as { __entries: { name: string; ready: boolean; translates: boolean; detail: string }[] }).__entries);

test("fotos del muro: suben y aparecen una sola vez, y solo cuando la imagen está cargada y decodificada", async ({ page }) => {
  await recordWallEntries(page);
  await page.goto("/");
  await expect(page.locator(".pub-tile").first()).toBeAttached();
  await expect(page.locator(".pub-tile[data-reveal]")).toHaveCount(0); // sin fundido genérico de recuadro: la foto tiene su propia entrada
  await expect.poll(() => page.locator(".pub-tile[data-wall]").count()).toBeGreaterThan(0); // tras hidratar
  await scrollThrough(page); await scrollBack(page);
  // Todas han terminado; si no, el mensaje de fallo dice en qué estado se quedó cada recuadro pendiente.
  await expect.poll(() => page.locator(".pub-tile[data-wall]").evaluateAll((tiles) => tiles.map((tile) => tile.getAttribute("data-wall")).join(",")), { timeout: 8000 }).toBe("");
  const entries = await wallEntries(page);
  expect(entries.length).toBeGreaterThan(0);
  for (const entry of entries) {
    expect(entry.ready, entry.name + " " + entry.detail).toBe(true); // nunca antes de cargar y decodificar
    expect(entry.translates).toBe(entry.name === "pub-rise-in"); // el fundido no desplaza; la subida sí
  }
  expect(entries.some((entry) => entry.name === "pub-rise-in")).toBe(true);
  // Estado final: la foto en su sitio, opaca y sin transformaciones residuales.
  const final = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".pub-tile")].map((tile) => {
    const layer = tile.querySelector<HTMLElement>(".pub-tile-photo")!, box = tile.getBoundingClientRect(), photo = layer.getBoundingClientRect();
    return { aligned: Math.abs(box.x - photo.x) < 1 && Math.abs(box.y - photo.y) < 1 && Math.abs(box.height - photo.height) < 1, transform: getComputedStyle(layer).transform, opacity: getComputedStyle(layer).opacity };
  }));
  for (const tile of final) { expect(tile.aligned).toBe(true); expect(tile.transform).toBe("none"); expect(tile.opacity).toBe("1"); }
  // Una sola vez: volver a pasar no la repite.
  const before = (await wallEntries(page)).length;
  await scrollThrough(page); await scrollBack(page);
  expect((await wallEntries(page)).length).toBe(before);
});

test("red 4G lenta: el hueco muestra el brillo de carga y la foto aparece solo con fundido al terminar de cargar ya en pantalla", async ({ page }) => {
  await recordWallEntries(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  // Además de la red lenta, las fotos tardan 1,5 s más: así los recuadros que quedan en pantalla siguen cargando de forma determinista.
  await page.route("**/api/portfolio/photos/**", async (route) => { await new Promise((resolve) => setTimeout(resolve, 1500)); await route.continue(); });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".pub-tile").first()).toBeAttached();
  await expect.poll(() => page.locator(".pub-tile[data-wall]").count()).toBeGreaterThan(0);
  await page.locator(".pub-wall").first().scrollIntoViewIfNeeded();
  // Mientras carga: hueco Metal reservado, brillo de carga activo y foto aún invisible.
  let state: { shimmer: string; layerOpacity: string; background: string; height: number } | null = null;
  await expect.poll(async () => {
    state = await page.evaluate(() => {
      const tile = document.querySelector<HTMLElement>(".pub-tile[data-wall='loading']");
      if (!tile) return null;
      return { shimmer: getComputedStyle(tile, "::after").animationName, layerOpacity: getComputedStyle(tile.querySelector(".pub-tile-photo")!).opacity, background: getComputedStyle(tile).backgroundColor, height: tile.getBoundingClientRect().height };
    });
    return state !== null;
  }, { timeout: 8000 }).toBe(true);
  expect(state).toEqual({ shimmer: "pub-shimmer", layerOpacity: "0", background: "rgb(42, 45, 43)", height: expect.any(Number) });
  expect(state!.height).toBeGreaterThan(100);
  await page.screenshot({ path: test.info().outputPath("wall-loading.png") });
  // Al terminar de cargar estando en pantalla: solo fundido, sin desplazamiento, y nunca antes de decodificar.
  await expect.poll(async () => (await wallEntries(page)).some((entry) => entry.name === "pub-fade-in"), { timeout: 30000 }).toBe(true);
  for (const entry of await wallEntries(page)) { expect(entry.ready, entry.name + " " + entry.detail).toBe(true); if (entry.name === "pub-fade-in") expect(entry.translates).toBe(false); }
});

test("«Ver fotos» no sugiere un enlace externo: lleva un icono de fotos y no la flecha ↗", async ({ page }) => {
  await page.goto("/");
  const open = page.getByRole("button", { name: /^Ver fotos/ });
  await expect(open).toBeVisible({ timeout: 5000 });
  await expect(open).not.toContainText("↗");
  await expect(open.locator("svg")).toHaveCount(1);
  await expect(open.locator("svg")).toHaveAttribute("aria-hidden", "true");
});
