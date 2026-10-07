import {afterAll,beforeAll,expect,it,vi} from "vitest";
import sharp from "sharp";
vi.mock("server-only",()=>({}));
import {deleteJob,deletePhoto,finishJob,uploadPhoto,prepareLegacyVariants,prepareJob} from "@/features/jobs/data";
import {publicPhotoResponse} from "@/features/portfolio/response";
import {storageFixture} from "./storage-fixture";
import {jobA,ownerA,ownerB} from "./database";
let fixture:Awaited<ReturnType<typeof storageFixture>>;
const media="77777777-7777-4777-8777-777777777777";
let file:File;
const original=`${ownerA}/${jobA}/${media}.png`;
const paths=[320,390,640,768].map(w=>`${jobA}/${media}/${w}.webp`).concat(`${jobA}/${media}.webp`);
beforeAll(async()=>{fixture=await storageFixture();file=new File([new Uint8Array(await sharp({create:{width:3840,height:2160,channels:3,background:"#abc"}}).png().toBuffer())],"4k.png",{type:"image/png"});});
afterAll(async()=>{await fixture?.close();});
it("limpia variantes parciales incluso si se pierde ACK, conserva original y reanuda sin duplicar",async()=>{
  const client=fixture.client(ownerA);
  fixture.faults.push({operation:"upload",path:paths[1],afterWrite:true});
  await expect(uploadPhoto(client,ownerA,jobA,media,file)).rejects.toThrow();
  expect(paths.filter(p=>fixture.files.has(`portfolio-derivatives/${p}`))).toEqual([]);
  expect(fixture.files.get(`job-originals/${original}`)?.bytes).toEqual(Buffer.from(await file.arrayBuffer()));
  await uploadPhoto(client,ownerA,jobA,media,file);await uploadPhoto(client,ownerA,jobA,media,file);
  expect(paths.every(p=>fixture.files.has(`portfolio-derivatives/${p}`))).toBe(true);
  expect((await fixture.db.query("select id from public.job_media where id=$1",[media])).rows).toHaveLength(1);
});
it("una variante preparada pasa por RLS en cada entrega y se retira sin cache",async()=>{
  await fixture.db.query("update public.jobs set is_public=true where id=$1",[jobA]);
  const download=(path:string)=>fixture.client(null).storage.from("portfolio-derivatives").download(path);
  const r=await publicPhotoResponse(jobA,media,new URL("http://localhost/photo?w=640"),download);expect(r.status).toBe(200);
  expect(Buffer.from(await r.arrayBuffer())).toEqual(fixture.files.get(`portfolio-derivatives/${paths[2]}`)?.bytes);
  await fixture.db.query("update public.jobs set is_public=false where id=$1",[jobA]);
  const withdrawn=await publicPhotoResponse(jobA,media,new URL("http://localhost/photo?w=640"),download);expect(withdrawn.status).toBe(404);expect(withdrawn.headers.get("cache-control")).toContain("no-store");
});
it("mantenimiento dry-run no escribe; completa solo faltantes sin sustituir master/original",async()=>{
  const master=Buffer.from(fixture.files.get(`portfolio-derivatives/${paths[4]}`)!.bytes);
  await fixture.db.query("delete from storage.objects where name=$1",[paths[0]]);fixture.files.delete(`portfolio-derivatives/${paths[0]}`);
  fixture.calls.length=0;
  expect(await prepareLegacyVariants(fixture.client(ownerA),ownerA,jobA,media,false)).toEqual([paths[0]]);
  expect(fixture.calls.some(c=>["upload","remove"].includes(c.operation))).toBe(false);
  await prepareLegacyVariants(fixture.client(ownerA),ownerA,jobA,media,true);
  expect(fixture.files.get(`portfolio-derivatives/${paths[4]}`)?.bytes).toEqual(master);
  expect(fixture.files.get(`job-originals/${original}`)?.bytes).toEqual(Buffer.from(await file.arrayBuffer()));
  expect(await prepareLegacyVariants(fixture.client(ownerA),ownerA,jobA,media,true)).toEqual([]);
});
it("deletePhoto conserva metadata ante fallo y luego elimina todas las variantes sin huérfanos",async()=>{
  fixture.faults.push({operation:"list",path:""});
  await expect(deletePhoto(fixture.client(ownerA),ownerA,jobA,media)).rejects.toThrow();
  expect((await fixture.db.query("select id from public.job_media where id=$1",[media])).rows).toHaveLength(1);
  await deletePhoto(fixture.client(ownerA),ownerA,jobA,media);
  expect(paths.some(p=>fixture.files.has(`portfolio-derivatives/${p}`))).toBe(false);expect(fixture.files.has(`job-originals/${original}`)).toBe(false);
});
it("si falla la limpieza parcial conserva identidad recuperable y un retry deja cero huérfanos",async()=>{
  const id="99999999-9999-4999-8999-999999999999";
  fixture.faults.push({operation:"upload",path:`${jobA}/${id}/640.webp`,afterWrite:true},{operation:"remove",path:""});
  await expect(uploadPhoto(fixture.client(ownerA),ownerA,jobA,id,file)).rejects.toThrow("Conservamos original y metadatos");
  expect((await fixture.db.query("select id from public.job_media where id=$1",[id])).rows).toHaveLength(1);
  await uploadPhoto(fixture.client(ownerA),ownerA,jobA,id,file);
  await deletePhoto(fixture.client(ownerA),ownerA,jobA,id);
  expect([...fixture.files.keys()].some(p=>p.includes(id))).toBe(false);
  expect((await fixture.db.query("select name from storage.objects where name like $1",[`%${id}%`])).rows).toHaveLength(0);
});
it("la subida directa no añade medios parciales a un trabajo que sigue publicado",async()=>{
  await fixture.db.query("update public.jobs set is_public=true where id=$1",[jobA]);
  await expect(uploadPhoto(fixture.client(ownerA),ownerA,jobA,"88888888-8888-4888-8888-888888888888",file)).rejects.toMatchObject({status:409});
  expect((await fixture.db.query("select id from public.job_media where id='88888888-8888-4888-8888-888888888888'")).rows).toHaveLength(0);
  await fixture.db.query("update public.jobs set is_public=false where id=$1",[jobA]);
});
it("finish recupera subida interrumpida y deleteJob elimina medios/originales/variantes",async()=>{
  const client=fixture.client(ownerA);
  fixture.faults.push({operation:"upload",path:paths[0]});await expect(uploadPhoto(client,ownerA,jobA,media,file)).rejects.toThrow();
  // Quitar el medio inicial del fixture, cuyo original no representa esta subida.
  await fixture.db.query("delete from public.job_media where id<>$1 and job_id=$2",[media,jobA]);
  await finishJob(client,ownerA,jobA,{name:"Fixture",job_date:"2026-10-07",paint_code:null,is_public:true});
  expect(paths.every(p=>fixture.files.has(`portfolio-derivatives/${p}`))).toBe(true);
  await expect(deletePhoto(fixture.client(ownerB),ownerB,jobA,media)).rejects.toThrow();
  await deleteJob(client,ownerA,jobA);expect([...fixture.files.keys()]).toHaveLength(0);
  expect((await fixture.db.query("select * from storage.objects")).rows).toHaveLength(0);
});
it.each([false,true])("fallo de metadata (ACK perdido=%s) no pierde originales y permite retry seguro",async afterWrite=>{
  const id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",photo="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const client=fixture.client(ownerA),fields={name:"Fixture de recuperación",job_date:"2026-10-07",paint_code:null,is_public:false};
  await prepareJob(client,ownerA,id,fields,true);await prepareJob(client,ownerA,id,fields,true);
  fixture.faults.push({operation:"insert-job_media",path:photo,afterWrite});
  await expect(uploadPhoto(client,ownerA,id,photo,file)).rejects.toThrow("No se pudo registrar");
  expect(fixture.files.has(`job-originals/${ownerA}/${id}/${photo}.png`)).toBe(afterWrite);
  expect((await fixture.db.query("select id from public.job_media where id=$1",[photo])).rows).toHaveLength(afterWrite?1:0);
  await uploadPhoto(client,ownerA,id,photo,file);
  const originalPath=`${ownerA}/${id}/${photo}.png`;
  fixture.faults.push({operation:"download",path:originalPath});
  await fixture.db.query("delete from storage.objects where name=$1",[`${id}/${photo}/320.webp`]);fixture.files.delete(`portfolio-derivatives/${id}/${photo}/320.webp`);
  await expect(prepareLegacyVariants(client,ownerA,id,photo,true)).rejects.toThrow("No se pudo leer el original");
  await expect(prepareLegacyVariants(fixture.client(ownerB),ownerB,id,photo,false)).rejects.toMatchObject({status:404});
  await expect(prepareLegacyVariants(client,ownerA,id,media,false)).rejects.toMatchObject({status:404});
  const changed=new File([new Uint8Array(await sharp({create:{width:2,height:2,channels:3,background:"#000"}}).png().toBuffer())],"different.png",{type:"image/png"});
  await expect(uploadPhoto(client,ownerA,id,photo,changed)).rejects.toMatchObject({status:409});
  await deleteJob(client,ownerA,id);expect([...fixture.files.keys()]).toHaveLength(0);
});
