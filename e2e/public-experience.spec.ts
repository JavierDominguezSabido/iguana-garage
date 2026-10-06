import { expect, test } from "@playwright/test";
import axe from "axe-core";

test("preview: última foto publicada y apertura de esa misma imagen", async ({ page }) => {
  await page.goto("/");
  const work = page.locator("article.pub-work").first();
  await work.getByRole("button", { name: /^Ver galería de / }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const thumbnails = dialog.locator(".pub-thumbnails img");
  if (await thumbnails.count() > 1) {
    const last = new URL((await thumbnails.last().getAttribute("src"))!, page.url()).pathname;
    const preview = new URL((await work.locator(".pub-work-photo img").getAttribute("src"))!, page.url()).pathname;
    const opened = new URL((await dialog.locator(".pub-full-photo img").getAttribute("src"))!, page.url()).pathname;
    expect(preview).toBe(last); expect(opened).toBe(preview);
  }
  await page.keyboard.press("Escape");
});

// Lecturas públicas únicamente: este recorrido no crea ni elimina fixtures en Supabase.
test("escaparate: acceso desde el pie de foto, visor y contacto", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate((source) => {
    const script = document.createElement("script");
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    script.textContent = source; document.head.append(script);
  }, axe.source);
  const accessibleNames = await page.evaluate(async () => {
    const scanner = window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string }[] }> } };
    const result = await scanner.axe.run({ runOnly: { type: "rule", values: ["label-content-name-mismatch"] } });
    return result.violations.map((violation) => violation.id);
  });
  expect(accessibleNames).toEqual([]);
  const works = page.locator("article.pub-work");
  expect(await works.count()).toBeGreaterThan(0);
  const opener = works.first().getByRole("button", { name: /^\d+ fotografías?\s*Ver galería de / });
  await expect(opener).toBeVisible();
  await opener.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const preview = works.first().locator(".pub-work-photo img");
  const thumbnails = dialog.locator(".pub-thumbnails button");
  const totalPhotos = await thumbnails.count();
  if (totalPhotos > 1) {
    const lastSource = await thumbnails.last().locator("img").getAttribute("src");
    const previewSource = await preview.getAttribute("src");
    expect(new URL(previewSource!, page.url()).pathname).toBe(new URL(lastSource!, page.url()).pathname);
  }
  const photo = dialog.locator(".pub-full-photo img");
  await expect.poll(() => photo.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2), y: Math.abs(bounds.y + bounds.height / 2 - innerHeight / 2), overflow: element.scrollWidth > element.clientWidth };
  });
  expect(geometry.x).toBeLessThan(1); expect(geometry.y).toBeLessThan(1); expect(geometry.overflow).toBe(false);
  await expect(photo).toHaveCSS("object-fit", "contain");
  if (totalPhotos > 1) {
    await dialog.getByRole("button", { name: "Siguiente →", exact: true }).click();
    await expect(dialog.getByText(/^Fotografía 1 de /)).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByText(`Fotografía ${totalPhotos} de ${totalPhotos}`, { exact: true })).toBeVisible();
    await thumbnails.last().click();
    await expect.poll(() => thumbnails.locator("img").evaluateAll((images) => images.every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true);
  }
  await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  await opener.click(); await dialog.getByRole("button", { name: "Cerrar fotografías", exact: true }).click();
  await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  const contact = page.locator('a[href^="https://wa.me/"]').first();
  if (await contact.count()) {
    await expect(contact).toHaveAttribute("target", "_blank");
    await expect(contact).toHaveAttribute("rel", "noopener noreferrer");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
