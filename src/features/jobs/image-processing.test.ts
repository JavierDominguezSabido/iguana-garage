import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processJobImage } from "./image-processing";

describe("procesado de las fotos del taller", () => {
  it.each(["jpeg", "webp"] as const)("prepara las cinco variantes medidas de una foto 4K %s una vez", async format => {
    const original = await sharp({create:{width:3840,height:2160,channels:3,background:"#789"}})[format]().toBuffer();
    const result = await processJobImage(original, `image/${format}`);
    const variants = (result as typeof result & { variants: Record<number,Buffer> }).variants;
    expect(Object.keys(variants ?? {})).toEqual(["320","390","640","768","1600"]);
    for(const size of [320,390,640,768,1600]) {
      const image = await sharp(variants[size]).metadata();
      expect(image.width).toBe(size);expect(image.width! / image.height!).toBeCloseTo(3840/2160,2);
      expect(image.exif).toBeUndefined();expect(image.icc).toBeUndefined();expect(image.orientation).toBeUndefined();
    }
    expect(result.webp.equals(variants[1600])).toBe(true);
  });
  it("orienta todas las variantes sin ampliar un original pequeño",async()=>{
    const original=await sharp({create:{width:60,height:90,channels:3,background:"#abc"}}).jpeg().withMetadata({orientation:6}).toBuffer();
    const result=await processJobImage(original,"image/jpeg");
    const variants=(result as typeof result & {variants:Record<number,Buffer>}).variants;
    expect(Object.keys(variants??{})).toHaveLength(5);
    for(const bytes of Object.values(variants)){const m=await sharp(bytes).metadata();expect([m.width,m.height]).toEqual([90,60]);expect(m.exif).toBeUndefined();}
  });
  it("admite un JPEG válido en el límite exacto de 10 MiB y rechaza un byte adicional",async()=>{
    const jpeg=await sharp({create:{width:3840,height:2160,channels:3,background:"#abc"}}).jpeg().toBuffer();
    const bytes=Buffer.alloc(10*1024*1024);jpeg.copy(bytes);
    expect((await processJobImage(bytes,"image/jpeg")).width).toBe(3840);
    await expect(processJobImage(Buffer.concat([bytes,Buffer.from([0])]),"image/jpeg")).rejects.toThrow();
  });
  it("rechaza WebP animado aunque su MIME y firma sean válidos",async()=>{
    const pixels=Buffer.alloc(2*4*3,40);pixels.fill(220,2*2*3);
    const frames=await sharp(pixels,{raw:{width:2,height:4,channels:3,pageHeight:2}}).webp({loop:0,delay:[50,50]}).toBuffer();
    expect((await sharp(frames).metadata()).pages).toBe(2);
    await expect(processJobImage(frames,"image/webp")).rejects.toThrow("Imagen no compatible");
  });
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
