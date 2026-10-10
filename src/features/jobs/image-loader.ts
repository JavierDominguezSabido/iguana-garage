import {isUuid} from "./validation";
import {preparedWidth} from "@/features/portfolio/variants";
import {viewerStageSizes} from "@/features/viewer/sizes";

// Solo construye URLs same-origin de la superficie privada autenticada.
export function privateImageLoader({src,width}:{src:string;width:number}):string {
  const prefix="/app/api/photos/";
  if(!src.startsWith(prefix)||!isUuid(src.slice(prefix.length)))throw new Error("Fotografía no disponible");
  return `${src}?w=${preparedWidth(width)}`;
}
export function privateViewerLoader(input:{src:string;width:number}):string {
  return privateImageLoader({...input,width:Math.max(640,preparedWidth(input.width))});
}

function ratio(width:number|null,height:number|null):number {
  return width && height && width>0 && height>0 ? width/height : 1080/1350;
}
// Refleja la ficha (/app/jobs/[id], app.css): contenido de 1280 px como máximo con márgenes de 16/32/48 px y, desde
// 1000 px, hoja de datos de 380 px a la derecha con 40 px de separación; foto contain limitada a 580 px de alto.
export function mainImageSizes(width:number|null,height:number|null):string {
  const cap=580*ratio(width,height);
  return `(min-width: 1376px) min(860px, ${cap}px), (min-width: 1200px) min(calc(100vw - 516px), ${cap}px), (min-width: 1000px) min(calc(100vw - 484px), ${cap}px), (min-width: 768px) min(calc(100vw - 64px), ${cap}px), min(calc(100vw - 32px), ${cap}px)`;
}
// Visor a pantalla completa: mismo escenario contain que el público (ver @/features/viewer/sizes).
export function privateViewerSizes(width:number|null,height:number|null):string {
  return viewerStageSizes(ratio(width,height));
}
