import {expect,test} from "@playwright/test";
import sharp from "sharp";

const manifestPath="/pwa/manifest.webmanifest";
test("descubre la PWA en login y nunca anuncia instalación en la home pública",async({page})=>{
  await page.goto("/app/login");
  await expect(page).toHaveURL(/\/app\/login$/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href",manifestPath);
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content","yes");
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content","Iguana Garage");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content","#0E1110");
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveCount(0);
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(0);
});

test("manifest e iconos públicos válidos, sin datos ni dependencia de sesión",async({request})=>{
  const response=await request.get(manifestPath);expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/manifest+json");
  const manifest=await response.json();
  expect(manifest).toMatchObject({id:"/app",name:"Iguana Garage",short_name:"Iguana Garage",start_url:"/app",scope:"/app",display:"standalone",orientation:"any",theme_color:"#0E1110",background_color:"#0E1110",lang:"es"});
  const origin="https://garage.example";
  const scope=new URL(manifest.scope,origin).href;
  expect(new URL("/",origin).href.startsWith(scope)).toBe(false);
  for(const route of [manifest.start_url,"/app/login","/app/new"]){expect(new URL(route,origin).href.startsWith(scope)).toBe(true);}
  expect(manifest.icons.filter((i:{purpose:string})=>i.purpose==="any").map((i:{sizes:string})=>i.sizes)).toEqual(["192x192","512x512"]);
  for(const icon of manifest.icons){
    expect(icon.src).toMatch(/^\/pwa\/[a-z0-9-]+\.png$/);
    const image=await request.get(icon.src);expect(image.status()).toBe(200);
    const metadata=await sharp(await image.body()).metadata();
    expect(metadata.format).toBe("png");expect(`${metadata.width}x${metadata.height}`).toBe(icon.sizes);
  }
  const apple=await request.get("/pwa/apple-touch-icon.png");expect(apple.status()).toBe(200);
  const metadata=await sharp(await apple.body()).metadata();expect([metadata.width,metadata.height]).toEqual([180,180]);
});

test("start_url conserva login SSR, no-store y ausencia de service workers/cachés",async({page,request})=>{
  const response=await request.get("/app",{maxRedirects:0});expect(response.status()).toBe(307);
  expect(new URL(response.headers().location,"http://localhost").pathname).toBe("/app/login");
  expect(response.headers()["cache-control"]).toContain("private, no-store");
  await page.goto("/app");await expect(page).toHaveURL(/\/app\/login$/);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href",manifestPath);
  const storage=await page.evaluate(async()=>({workers:(await navigator.serviceWorker.getRegistrations()).length,caches:await caches.keys()}));
  expect(storage).toEqual({workers:0,caches:[]});
  await page.reload();await expect(page).toHaveURL(/\/app\/login$/);
});

test("login antiguo redirige al login privado y solo esa página acepta anónimo",async({page,request})=>{
  const legacy=await request.get("/login",{maxRedirects:0});
  expect(legacy.status()).toBe(307);
  expect(new URL(legacy.headers().location,"http://localhost").pathname).toBe("/app/login");
  expect(legacy.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(await legacy.text()).not.toMatch(/<script\b|<html\b/i);
  const errors:string[]=[];
  page.on("console",message=>{if(message.type()==="error")errors.push(message.text());});
  page.on("pageerror",()=>errors.push("pageerror"));
  await page.goto("/login");await expect(page).toHaveURL(/\/app\/login$/);
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
  await expect(page.getByRole("heading",{name:"Acceso privado"})).toBeVisible();
  await expect(page.locator(".private-header")).toHaveCount(0);
  for(const path of ["/app/login/extra","/app/new","/app/api/photos/33333333-3333-4333-8333-333333333333?w=390"]){
    const response=await request.get(path,{maxRedirects:0});expect(response.status()).toBe(307);
    expect(new URL(response.headers().location,"http://localhost").pathname).toBe("/app/login");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
  }
});

test("favicon nativo responde con un ICO válido y se anuncia en la web normal",async({page,request})=>{
  const response=await request.get("/favicon.ico");expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toMatch(/^image\/(?:x-icon|vnd\.microsoft\.icon)/);
  const ico=await response.body();
  expect(ico.readUInt16LE(0)).toBe(0);expect(ico.readUInt16LE(2)).toBe(1);
  const count=ico.readUInt16LE(4);expect(count).toBeGreaterThan(0);
  for(let index=0;index<count;index++){
    const entry=6+index*16,width=ico[entry]||256,height=ico[entry+1]||256;
    const length=ico.readUInt32LE(entry+8),offset=ico.readUInt32LE(entry+12);
    expect(offset+length).toBeLessThanOrEqual(ico.length);
    const bitmap=ico.subarray(offset,offset+length);
    expect(bitmap.readUInt32LE(0)).toBe(40); // BITMAPINFOHEADER, compatible también con ICO clásico.
    expect([bitmap.readInt32LE(4),bitmap.readInt32LE(8)]).toEqual([width,height*2]);
    expect(bitmap.readUInt16LE(14)).toBe(32);
  }
  await page.goto("/");
  await expect(page.locator('link[rel="icon"][href^="/favicon.ico"]')).toHaveCount(1);
  expect(await page.evaluate(async()=>{
    const icon=new Image();icon.src="/favicon.ico";await icon.decode();
    return icon.naturalWidth>0&&icon.naturalHeight>0;
  })).toBe(true);
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
});
