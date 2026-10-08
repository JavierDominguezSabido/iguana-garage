import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Imagen estática para compartir (Open Graph): solo marca. Logo oficial completo, proporción intacta, sobre Carbon,
// más «Chapa y pintura» con la tipografía pública del sitio (Barlow Condensed 800, descargada de Google Fonts al generar).
// Sin fotos de trabajos. No se ejecuta durante build/start ni en peticiones; el resultado se versiona.
const WIDTH = 1200, HEIGHT = 630;
const logo = (await readFile("assets/brand/iguana-garage-logo-horizontal.png")).toString("base64");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&display=block");
html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#0E1110}
.card{width:${WIDTH}px;height:${HEIGHT}px;display:flex;flex-direction:column;align-items:center;justify-content:center}
img{width:900px;height:auto;display:block;margin-top:-30px}
p{margin:-34px 0 0;font:800 118px/1 "Barlow Condensed",sans-serif;text-transform:uppercase;letter-spacing:.012em;color:#F8F4DA}
</style></head><body><div class="card"><img alt="" src="data:image/png;base64,${logo}"><p>Chapa y pintura</p></div></body></html>`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(async () => { await document.fonts.load('800 118px "Barlow Condensed"'); await document.fonts.ready; });
const shot = await page.screenshot({ clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();
await mkdir("public/share", { recursive: true });
await writeFile("public/share/iguana-garage-og.png", await sharp(shot).png({ compressionLevel: 9 }).toBuffer());
