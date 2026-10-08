import {afterAll,beforeAll,beforeEach,expect,it,vi} from "vitest";
import {GET} from "@/app/app/api/photos/[id]/route";
import {storageFixture} from "./storage-fixture";
import {ownerA,ownerB,jobA,mediaA,jobB,mediaB} from "./database";
vi.mock("server-only",()=>({}));
const {authenticate}=vi.hoisted(()=>({authenticate:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({requireAuthenticatedSupabase:authenticate}));
let fixture:Awaited<ReturnType<typeof storageFixture>>;
const invoke=(id=mediaA,query="?w=390")=>GET(new Request(`http://localhost/app/api/photos/${id}${query}`),{params:Promise.resolve({id})});
beforeAll(async()=>{
  fixture=await storageFixture();
  for(const [owner,job,media] of [[ownerA,jobA,mediaA],[ownerB,jobB,mediaB]]) {
    const entries=[...([320,390,640,768,1600] as const).map(width=>({bucket:"portfolio-derivatives",path:width===1600?`${job}/${media}.webp`:`${job}/${media}/${width}.webp`,bytes:Buffer.from(`prepared-${width}`),type:"image/webp"})),{bucket:"job-originals",path:`${owner}/${job}/${media}.png`,bytes:Buffer.from("original"),type:"image/png"}];
    for(const entry of entries){await fixture.db.query("insert into storage.objects(bucket_id,name) values($1,$2)",[entry.bucket,entry.path]);fixture.files.set(`${entry.bucket}/${entry.path}`,entry);}
  }
});
beforeEach(()=>{authenticate.mockResolvedValue({supabase:fixture.client(ownerA)});fixture.calls.length=0;});
afterAll(async()=>{await fixture?.close();});
it.each([320,390,640,768,1600])("propietario recibe variante %i pasando por RLS real",async width=>{
  const response=await invoke(mediaA,`?w=${width}`);expect(response.status).toBe(200);expect(await response.text()).toBe(`prepared-${width}`);
  expect(fixture.calls).toHaveLength(1);expect(response.headers.get("x-iguana-image-source")).toBe("prepared");
});
it.each([false,true])("otro propietario no lee medio ajeno, incluso publicado=%s",async published=>{
  await fixture.db.query("update public.jobs set is_public=$1 where id=$2",[published,jobA]);
  authenticate.mockResolvedValue({supabase:fixture.client(ownerB)});
  for(const query of ["?w=390","?original=1",""]){expect((await invoke(mediaA,query)).status).toBe(404);}
  expect(fixture.calls).toHaveLength(0);
  expect((await invoke(mediaB)).status).toBe(200);
});
it("anónimo no ve metadatos ni original ni variantes por las políticas reales",async()=>{
  const anon=fixture.client(null);
  const metadata=await anon.from("job_media").select("id").eq("id",mediaA);
  expect(metadata.data).toBeNull();expect(metadata.error).toBeTruthy();
  expect((await anon.storage.from("job-originals").download(`${ownerA}/${jobA}/${mediaA}.png`)).error).toBeTruthy();
  await fixture.db.query("update public.jobs set is_public=false where id=$1",[jobA]);
  expect((await anon.storage.from("portfolio-derivatives").download(`${jobA}/${mediaA}/390.webp`)).error).toBeTruthy();
  authenticate.mockRejectedValue(new Error("no session"));expect((await invoke()).status).toBe(401);
});
it("fallback pasa por RLS y nunca sustituye master ausente por original",async()=>{
  const variant=`${jobA}/${mediaA}/390.webp`,master=`${jobA}/${mediaA}.webp`;
  await fixture.db.query("delete from storage.objects where name=$1",[variant]);fixture.files.delete(`portfolio-derivatives/${variant}`);
  let response=await invoke();expect(await response.text()).toBe("prepared-1600");expect(response.headers.get("x-iguana-image-source")).toBe("legacy-fallback");
  await fixture.db.query("delete from storage.objects where name=$1",[master]);fixture.files.delete(`portfolio-derivatives/${master}`);
  fixture.calls.length=0;response=await invoke();expect(response.status).toBe(404);
  expect(fixture.calls.map(c=>c.path)).toEqual([variant,master]);expect(fixture.files.has(`job-originals/${ownerA}/${jobA}/${mediaA}.png`)).toBe(true);
});
