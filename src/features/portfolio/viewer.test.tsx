import {expect,it} from "vitest";
import {viewerImageSizes} from "./viewer";

it("limita la resolución del visor al ancho pintado por contain sin cambiar su caja",()=>{
  expect(viewerImageSizes(0.75)).toBe("min(calc(100vw - 50px), 1110px, 45dvh, 540px)");
  expect(viewerImageSizes(16/9)).toBe("min(calc(100vw - 50px), 1110px, 106.6667dvh, 1280px)");
});
it("sin proporción conocida usa el ancho real del marco, nunca una suposición vertical",()=>{
  for(const ratio of [undefined,0,-1,NaN,Infinity])expect(viewerImageSizes(ratio)).toBe("min(calc(100vw - 50px), 1110px)");
});
