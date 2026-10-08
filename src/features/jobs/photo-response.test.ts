import {beforeEach,expect,it,vi} from "vitest";
import {GET} from "@/app/app/api/photos/[id]/route";
vi.mock("server-only",()=>({}));
const {authenticate,lookup,download}=vi.hoisted(()=>({authenticate:vi.fn(),lookup:vi.fn(),download:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({requireAuthenticatedSupabase:authenticate}));
const id="33333333-3333-4333-8333-333333333333",job="22222222-2222-4222-8222-222222222222";
const original=`owner/${job}/${id}.jpg`,master=`${job}/${id}.webp`;
const invoke=(query="",media=id)=>GET(new Request(`http://localhost/app/api/photos/${media}${query}`),{params:Promise.resolve({id:media})});
beforeEach(()=>{
  lookup.mockReset();download.mockReset();authenticate.mockReset();
  lookup.mockResolvedValue({data:{job_id:job,storage_path:original,mime_type:"image/jpeg"},error:null});
  download.mockResolvedValue({data:new Blob(["prepared"],{type:"image/webp"}),error:null});
  authenticate.mockResolvedValue({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:lookup})})}),storage:{from:(bucket:string)=>({download:(path:string)=>download(bucket,path)})}}});
});
it.each([320,390,640,768,1600])("entrega %i preparado con no-store y sin leer original",async width=>{
  const response=await invoke(`?w=${width}`);expect(response.status).toBe(200);expect(await response.text()).toBe("prepared");
  expect(download).toHaveBeenCalledExactlyOnceWith("portfolio-derivatives",width===1600?master:`${job}/${id}/${width}.webp`);
  expect(response.headers.get("cache-control")).toBe("private, no-store");expect(response.headers.get("cdn-cache-control")).toBe("no-store");
});
it("mantiene el master legacy y el original solo bajo solicitud explícita autenticada",async()=>{
  await invoke();expect(download).toHaveBeenLastCalledWith("portfolio-derivatives",master);download.mockClear();
  await invoke("?original=1");expect(download).toHaveBeenCalledExactlyOnceWith("job-originals",original);
});
it.each(["?w=321","?w=9999","?w=0","?w=-1","?w=390.5","?w=00390","?w=abc","?w=","?w=390&w=640","?path=../../secret","?original=2","?original=1&w=320"])("rechaza parámetros ambiguos/manipulados %s",async query=>{
  expect((await invoke(query)).status).toBe(404);expect(lookup).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();
});
it("exige sesión antes de leer medios incluso para original",async()=>{
  authenticate.mockRejectedValue(new Error("no session"));
  for(const query of ["?w=390","?original=1"]){const r=await invoke(query);expect(r.status).toBe(401);expect(r.headers.get("cache-control")).toContain("no-store");}
  expect(lookup).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();
});
it("no descarga si el medio no es visible por RLS o su id no es válido",async()=>{
  lookup.mockResolvedValue({data:null,error:null});expect((await invoke("?w=390")).status).toBe(404);
  expect((await invoke("?w=390","../../secret")).status).toBe(404);expect(download).not.toHaveBeenCalled();
});
it("solo usa master si falta variante; no usa original si faltan ambos",async()=>{
  download.mockResolvedValueOnce({data:null,error:{statusCode:"404"}}).mockResolvedValueOnce({data:new Blob(["master"],{type:"image/webp"}),error:null});
  const r=await invoke("?w=390");expect(await r.text()).toBe("master");expect(r.headers.get("x-iguana-image-source")).toBe("legacy-fallback");
  expect(download.mock.calls).toEqual([["portfolio-derivatives",`${job}/${id}/390.webp`],["portfolio-derivatives",master]]);
  download.mockClear();download.mockResolvedValue({data:null,error:{statusCode:"404"}});expect((await invoke("?w=390")).status).toBe(404);
  expect(download.mock.calls.every(c=>c[0]==="portfolio-derivatives")).toBe(true);
});
it("no intenta fallback ante caída de Storage y convierte excepciones en error sin cache",async()=>{
  download.mockResolvedValue({data:null,error:{status:503}});expect((await invoke("?w=390")).status).toBe(503);expect(download).toHaveBeenCalledOnce();
  download.mockRejectedValue(new Error("network"));const r=await invoke("?w=640");expect(r.status).toBe(503);expect(r.headers.get("cache-control")).toContain("no-store");
});
it("tolera el 400 que Storage usa para objetos ausentes sin leer originales",async()=>{
  download.mockResolvedValueOnce({data:null,error:{status:400}}).mockResolvedValueOnce({data:new Blob(["master"]),error:null});
  const r=await invoke("?w=390");expect(r.status).toBe(200);expect(r.headers.get("x-iguana-image-source")).toBe("legacy-fallback");
  expect(download).toHaveBeenLastCalledWith("portfolio-derivatives",master);
});
