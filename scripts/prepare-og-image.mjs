import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Imagen estática para compartir (Open Graph): solo marca. Logo oficial completo, proporción intacta, sobre Carbon,
// más «Chapa y pintura.» con la tipografía pública del sitio (Big Shoulders 900, eje opsz 72, inclinada como en la home,
// descargada de Google Fonts al generar) y las dos franjas verdes de la librea. Sin fotos de trabajos.
// No se ejecuta durante build/start ni en peticiones; el resultado se versiona.
const WIDTH = 1200, HEIGHT = 630;
const logo = (await readFile("assets/brand/iguana-garage-logo-horizontal.png")).toString("base64");
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@import url("https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,900&display=block");
html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#0E1110;overflow:hidden}
.card{position:relative;width:${WIDTH}px;height:${HEIGHT}px;display:flex;flex-direction:column;align-items:center;justify-content:center}
.livery{position:absolute;top:-40px;bottom:-40px;left:50%;width:220px;margin-left:-110px;transform:skewX(-14deg);opacity:.2;
  background:linear-gradient(90deg,transparent 0 18%,#7A9A3A 18% 36%,transparent 36% 64%,#7A9A3A 64% 82%,transparent 82%)}
img{position:relative;width:820px;height:auto;display:block;margin-top:-40px}
p{position:relative;margin:-44px 0 0;font:900 150px/1 "Big Shoulders",sans-serif;font-variation-settings:"opsz" 72;text-transform:uppercase;letter-spacing:-.005em;color:#F8F4DA;transform:skewX(-9deg)}
p span{color:#7A9A3A}
</style></head><body><div class="card"><div class="livery"></div><img alt="" src="data:image/png;base64,${logo}"><p>Chapa y pintura<span>.</span></p></div></body></html>`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(async () => { await document.fonts.load('900 150px "Big Shoulders"'); await document.fonts.ready; });
const shot = await page.screenshot({ clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
await browser.close();
await mkdir("public/share", { recursive: true });
await writeFile("public/share/iguana-garage-og.png", await sharp(shot).png({ compressionLevel: 9 }).toBuffer());
