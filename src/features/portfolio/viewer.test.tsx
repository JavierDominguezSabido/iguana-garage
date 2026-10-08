import {expect,it} from "vitest";
import {viewerImageSizes} from "./viewer";

it("limita la resolución del visor a pantalla completa al ancho que pinta contain, con flechas laterales en escritorio",()=>{
  expect(viewerImageSizes(0.75)).toBe("(min-width: 900px) min(calc(100vw - 176px), calc((100dvh - 148px) * 0.75)), min(100vw, calc((100dvh - 148px) * 0.75))");
  expect(viewerImageSizes(16/9)).toBe("(min-width: 900px) min(calc(100vw - 176px), calc((100dvh - 148px) * 1.7778)), min(100vw, calc((100dvh - 148px) * 1.7778))");
});
it("sin proporción conocida usa el ancho real del marco, nunca una suposición vertical",()=>{
  for(const ratio of [undefined,0,-1,NaN,Infinity])expect(viewerImageSizes(ratio)).toBe("(min-width: 900px) calc(100vw - 176px), 100vw");
});
