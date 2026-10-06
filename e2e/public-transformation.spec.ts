import { expect, test } from "@playwright/test";

// Solo lecturas públicas: no cuentas, fixtures ni mutaciones en Supabase.
test("transformación: comparación curada y fotografías completas en el visor", async ({ page }) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Transformación", exact: true });
  await expect(section).toBeVisible({ timeout: 5000 });
  await expect(section.locator("figure")).toHaveCount(2);
  await expect(section.getByText("Antes", { exact: true })).toBeVisible();
  await expect(section.getByText("Después", { exact: true })).toBeVisible();
  await expect(section.getByText("Preparación", { exact: true })).toBeVisible();
  await expect(section.getByText("Acabado de pintura", { exact: true })).toBeVisible();
  for (const moment of ["Antes", "Después"]) {
    const opener = section.getByRole("button", { name: `Ampliar ${moment}: Suzuki e Vitara`, exact: true });
    const expectedPath = new URL((await opener.locator("img").getAttribute("src"))!, page.url()).pathname;
    await opener.focus(); await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Fotografías de Suzuki e Vitara", exact: true });
    await expect(dialog).toBeVisible();
    const photo = dialog.locator(".pub-full-photo img");
    await expect.poll(() => photo.evaluate(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0)).toBe(true);
    expect(new URL((await photo.getAttribute("src"))!, page.url()).pathname).toBe(expectedPath);
    await expect(photo).toHaveCSS("object-fit", "contain");
    const geometry = await dialog.evaluate(element => {
      const r = element.getBoundingClientRect();
      return { x: Math.abs(r.x + r.width / 2 - innerWidth / 2), y: Math.abs(r.y + r.height / 2 - innerHeight / 2), overflow: element.scrollWidth > element.clientWidth };
    });
    expect(geometry.x).toBeLessThan(1); expect(geometry.y).toBeLessThan(1); expect(geometry.overflow).toBe(false);
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowLeft");
    expect(new URL((await photo.getAttribute("src"))!, page.url()).pathname).toBe(expectedPath);
    await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(opener).toBeFocused();
  }
  const panels = await section.locator(".pub-transform-photo").evaluateAll(elements => elements.map(element => {
    const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  expect(Math.abs(panels[0].y - panels[1].y)).toBeLessThan(1);
  expect(panels[1].x).toBeGreaterThan(panels[0].x);
  if (page.viewportSize()!.width === 390) expect((await section.boundingBox())!.height).toBeLessThan(500);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
