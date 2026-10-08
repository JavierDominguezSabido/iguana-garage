import {isUuid} from "./validation";
import {preparedWidth} from "@/features/portfolio/variants";

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
// Refleja la galería existente: padding, gap, columnas 1.7/1, aside mínimo
// de 260px y fotografía contain limitada a 580px de alto. No cambia el layout.
export function mainImageSizes(width:number|null,height:number|null):string {
  const cap=580*ratio(width,height);
  return `(min-width: 1200px) min(710.222px, ${cap}px), (min-width: 1100px) min(calc((100vw - 72px) * 1.7 / 2.7), ${cap}px), (min-width: 768px) min(calc(100vw - 356px), calc((100vw - 96px) * 1.7 / 2.7), ${cap}px), min(calc(100vw - 40px), ${cap}px)`;
}
export function privateViewerSizes(width:number|null,height:number|null):string {
  return `min(calc(100vw - 54px), 1050px, ${72*ratio(width,height)}dvh)`;
}
