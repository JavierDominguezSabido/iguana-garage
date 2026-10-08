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
  await page.goto("/login");await expect(page).toHaveURL(/\/app\/login$/);
  await expect(page.getByRole("heading",{name:"Acceso privado"})).toBeVisible();
  await expect(page.locator(".private-header")).toHaveCount(0);
  for(const path of ["/app/login/extra","/app/new","/app/api/photos/33333333-3333-4333-8333-333333333333?w=390"]){
    const response=await request.get(path,{maxRedirects:0});expect(response.status()).toBe(307);
    expect(new URL(response.headers().location,"http://localhost").pathname).toBe("/app/login");
    expect(response.headers()["cache-control"]).toContain("private, no-store");
  }
});
