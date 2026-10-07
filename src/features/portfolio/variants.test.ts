import {expect,it} from "vitest";
import {derivativePath,derivativePaths,preparedWidth,type PreparedWidth} from "./variants";
const job="22222222-2222-4222-8222-222222222222",media="33333333-3333-4333-8333-333333333333";
it("mantiene exactamente master y cuatro sidecars medidos en la misma whitelist de limpieza",()=>{
  expect(derivativePaths(job,media)).toEqual([`${job}/${media}/320.webp`,`${job}/${media}/390.webp`,`${job}/${media}/640.webp`,`${job}/${media}/768.webp`,`${job}/${media}.webp`]);
});
it("rechaza paths y tamaños manipulados incluso fuera de TypeScript",()=>{
  for(const width of [321,1024,9999,0])expect(()=>derivativePath(job,media,width as PreparedWidth)).toThrow();
  expect(()=>derivativePath("../job",media,320)).toThrow();expect(()=>derivativePath(job,"other/320",640)).toThrow();
  for(const width of [0,-1,NaN,Infinity,1.5])expect(()=>preparedWidth(width)).toThrow();
});
