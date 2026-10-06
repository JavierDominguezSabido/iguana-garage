import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processJobImage } from "./image-processing";

describe("procesado de las fotos del taller", () => {
  it("genera WebP válido, orienta la foto y retira EXIF", async () => {
    const original = await sharp({ create: { width: 60, height: 90, channels: 3, background: "#aaa" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const processed = await processJobImage(original, "image/jpeg");
    const metadata = await sharp(processed.webp).metadata();
    expect(metadata.format).toBe("webp"); expect(metadata.exif).toBeUndefined(); expect(metadata.orientation).toBeUndefined();
    expect(processed.width).toBe(90); expect(processed.height).toBe(60);
  });
  it("rechaza MIME falso y bytes truncados antes de subirlos", async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#aaa" } }).png().toBuffer();
    await expect(processJobImage(png, "image/jpeg")).rejects.toThrow();
    await expect(processJobImage(png.subarray(0, 16), "image/png")).rejects.toThrow();
  });
  it("acota píxeles y dimensiones del derivado sin deformar", async () => {
    const tooLarge = await sharp({ create: { width: 7000, height: 7000, channels: 3, background: "#aaa" } }).png().toBuffer();
    await expect(processJobImage(tooLarge, "image/png")).rejects.toThrow();
    const original = await sharp({ create: { width: 2000, height: 1000, channels: 3, background: "#aaa" } }).png().toBuffer();
    const result = await processJobImage(original, "image/png");
    const metadata = await sharp(result.webp).metadata(); expect(metadata.width).toBe(1600); expect(metadata.height).toBe(800);
  });
});
