import { expect, test } from "@playwright/test";
import axe from "axe-core";

test("muro: cada foto abre el visor en esa misma imagen", async ({ page }) => {
  await page.goto("/");
  const work = page.locator("article.pub-work").first();
  const tile = work.locator(".pub-tile").last();
  await tile.scrollIntoViewIfNeeded();
  const expected = new URL((await tile.locator("img").getAttribute("src"))!, page.url()).pathname;
  await tile.getByRole("button", { name: /^Ampliar .+, fotografía \d+$/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  expect(new URL((await dialog.locator(".pub-full-photo img").getAttribute("src"))!, page.url()).pathname).toBe(expected);
  await page.keyboard.press("Escape");
});

// Lecturas públicas únicamente: este recorrido no crea ni elimina fixtures en Supabase.
test("escaparate: bandas por trabajo, visor, accesibilidad y contacto", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate((source) => {
    const script = document.createElement("script");
    script.nonce = document.querySelector<HTMLScriptElement>("script[nonce]")?.nonce ?? "";
    script.textContent = source; document.head.append(script);
  }, axe.source);
  const violations = await page.evaluate(async () => {
    const scanner = window as unknown as { axe: { run: (options: unknown) => Promise<{ violations: { id: string; nodes: { target: unknown }[] }[] }> } };
    const result = await scanner.axe.run({ runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } });
    return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => String(node.target)).join(" | ")}`);
  });
  expect(violations).toEqual([]);
  const works = page.locator("article.pub-work");
  expect(await works.count()).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 2, name: "Trabajos realizados" })).toBeVisible();
  const band = works.first().locator(".pub-band");
  await expect(band.getByRole("heading", { level: 3 })).toBeVisible();
  await expect(band.locator("time")).toBeVisible();
  const tiles = works.first().locator(".pub-tile");
  const totalPhotos = await tiles.count();
  expect(totalPhotos).toBeGreaterThan(0);
  const opener = tiles.first().getByRole("button", { name: /^Ampliar .+, fotografía 1$/ });
  await opener.scrollIntoViewIfNeeded();
  await expect(opener).toBeVisible();
  await opener.focus(); await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const thumbnails = dialog.locator(".pub-thumbnails button");
  const photo = dialog.locator(".pub-full-photo img");
  await expect.poll(() => photo.evaluate((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: Math.abs(bounds.x + bounds.width / 2 - innerWidth / 2), y: Math.abs(bounds.y + bounds.height / 2 - innerHeight / 2), overflow: element.scrollWidth > element.clientWidth };
  });
  expect(geometry.x).toBeLessThan(1); expect(geometry.y).toBeLessThan(1); expect(geometry.overflow).toBe(false);
  await expect(photo).toHaveCSS("object-fit", "contain");
  await expect(dialog.getByText(`Fotografía 1 de ${totalPhotos}`, { exact: true })).toBeVisible();
  if (totalPhotos > 1) {
    await dialog.getByRole("button", { name: "Siguiente →", exact: true }).click();
    await expect(dialog.getByText(`Fotografía 2 de ${totalPhotos}`, { exact: true })).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.getByText(`Fotografía 1 de ${totalPhotos}`, { exact: true })).toBeVisible();
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
