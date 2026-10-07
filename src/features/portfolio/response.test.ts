import {beforeEach,expect,it,vi} from "vitest";
import sharp from "sharp";
import {GET} from "@/app/api/portfolio/photos/[jobId]/[mediaId]/route";
const {download,resize}=vi.hoisted(()=>({download:vi.fn(),resize:vi.fn()}));
vi.mock("@/features/portfolio/data",()=>({publicSupabase:()=>({storage:{from:()=>({download})}})}));
vi.mock("@/features/portfolio/image-processing",()=>({resizePublicPhoto:resize}));
const job="22222222-2222-4222-8222-222222222222",media="33333333-3333-4333-8333-333333333333";
const invoke=(w=640)=>GET(new Request(`http://localhost/photo?w=${w}`),{params:Promise.resolve({jobId:job,mediaId:media})});
beforeEach(()=>{download.mockReset();resize.mockReset();});
it("transmite la variante preparada sin ejecutar Sharp",async()=>{
  const bytes=await sharp({create:{width:30,height:20,channels:3,background:"#abc"}}).webp().toBuffer();
  download.mockResolvedValue({data:new Blob([new Uint8Array(bytes)],{type:"image/webp"}),error:null});resize.mockResolvedValue(bytes);
  const r=await invoke();expect(r.status).toBe(200);expect(Buffer.from(await r.arrayBuffer())).toEqual(bytes);
  expect(download).toHaveBeenCalledExactlyOnceWith(`${job}/${media}/640.webp`);expect(resize).not.toHaveBeenCalled();
  expect(r.headers.get("cache-control")).toContain("no-store");expect(r.headers.get("cdn-cache-control")).toBe("no-store");
});
it("fallback legacy seguro: autoriza y descarga solo el master antes de resize",async()=>{
  const bytes=await sharp({create:{width:30,height:20,channels:3,background:"#abc"}}).webp().toBuffer();
  download.mockResolvedValueOnce({data:null,error:{status:404}}).mockResolvedValueOnce({data:new Blob([new Uint8Array(bytes)]),error:null});resize.mockResolvedValue(bytes);
  expect((await invoke()).status).toBe(200);expect(download.mock.calls.map(c=>c[0])).toEqual([`${job}/${media}/640.webp`,`${job}/${media}.webp`]);expect(resize).toHaveBeenCalledOnce();
});
it("master 1600 directo, denegación fresca tras retirada y no-store en errores",async()=>{
  download.mockResolvedValue({data:null,error:{status:404}});
  const r=await invoke(1600);expect(r.status).toBe(404);expect(download).toHaveBeenCalledExactlyOnceWith(`${job}/${media}.webp`);expect(resize).not.toHaveBeenCalled();expect(r.headers.get("cache-control")).toContain("no-store");
});
it("no oculta una caída de Storage con otro resize, ni admite widths arbitrarios",async()=>{
  download.mockResolvedValue({data:null,error:{status:503}});expect((await invoke()).status).toBe(503);expect(download).toHaveBeenCalledOnce();expect(resize).not.toHaveBeenCalled();download.mockClear();
  expect((await invoke(321)).status).toBe(404);expect(download).not.toHaveBeenCalled();
});
it("rechaza bytes corruptos y exceso de tamaño sin intentar un resize",async()=>{
  for(const bytes of [Buffer.from("invalid"),Buffer.alloc(5*1024*1024+1)]){
    download.mockResolvedValue({data:new Blob([new Uint8Array(bytes)]),error:null});expect((await invoke()).status).toBe(503);expect(resize).not.toHaveBeenCalled();
  }
});
it("deniega sin originales si faltan variante/master y convierte excepción de red en 503",async()=>{
  download.mockResolvedValue({data:null,error:{statusCode:"404"}});expect((await invoke()).status).toBe(404);expect(download).toHaveBeenCalledTimes(2);expect(resize).not.toHaveBeenCalled();
  download.mockRejectedValue(new Error("offline"));expect((await invoke()).status).toBe(503);
});
