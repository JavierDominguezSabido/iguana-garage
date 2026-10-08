import {expect,it} from "vitest";
import {privateImageLoader,privateViewerLoader,mainImageSizes,privateViewerSizes} from "./image-loader";
const src="/app/api/photos/33333333-3333-4333-8333-333333333333";
it.each([[70,320],[350,390],[435,640],[700,768],[900,1600],[2000,1600]])("mapea %i px a variante %i",(width,expected)=>{
  expect(privateImageLoader({src,width})).toBe(`${src}?w=${expected}`);
});
it.each([[390,640],[700,768],[1000,1600]])("visor %i usa %i sin recurrir al original",(width,expected)=>{
  expect(privateViewerLoader({src,width})).toBe(`${src}?w=${expected}`);
});
it.each(["https://remote/photo","/api/portfolio/photos/id","/app/api/photos/../other",`${src}?original=1`,`${src}/640.webp`])("no construye rutas privadas desde entradas arbitrarias %s",src=>{
  expect(()=>privateImageLoader({src,width:390})).toThrow();
});
it("sizes conserva las limitaciones CSS reales sin usar originales",()=>{
  expect(mainImageSizes(1080,1440)).toContain("435px");expect(mainImageSizes(1600,900)).toContain("1031.111");
  expect(privateViewerSizes(1080,1440)).toBe("(min-width: 900px) min(calc(100vw - 176px), calc((100dvh - 148px) * 0.75)), min(100vw, calc((100dvh - 148px) * 0.75))");
  expect(privateViewerSizes(null,null)).toContain("* 0.8)");
  expect(mainImageSizes(null,null)).toContain("464px");
});
it.each([0,-1,NaN,1.5])("no admite anchos inválidos %s en ningún loader",width=>{
  expect(()=>privateImageLoader({src,width})).toThrow();expect(()=>privateViewerLoader({src,width})).toThrow();
});
