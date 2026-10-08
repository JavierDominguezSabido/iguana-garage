import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, isolatedDatabase, jobA, jobB, mediaA, mediaB, ownerA, ownerB } from "./database";

let db: PGlite;
const legacy = `${jobA}/${mediaA}.webp`;
const paths = [legacy,...[320,390,640,768].map(width => `${jobA}/${mediaA}/${width}.webp`)];
beforeAll(async()=>{db=await isolatedDatabase();});
afterAll(async()=>{await db?.close();});

describe("Storage: whitelist responsive bajo RLS PostgreSQL aislado",()=>{
  it.each(paths)("el propietario inserta, lee y elimina %s",async path=>{
    await asRole(db,"authenticated",ownerA,"object.upload","insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)",[path]);
    expect((await asRole(db,"authenticated",ownerA,"object.list","select name from storage.objects where name=$1",[path])).rows).toHaveLength(1);
    expect((await asRole(db,"authenticated",ownerB,"object.list","select name from storage.objects where name=$1",[path])).rows).toHaveLength(0);
    expect((await asRole(db,"authenticated",ownerB,"object.delete","delete from storage.objects where name=$1 returning name",[path])).rows).toHaveLength(0);
    expect((await asRole(db,"authenticated",ownerA,"object.delete","delete from storage.objects where name=$1 returning name",[path])).rows).toHaveLength(1);
  });
  it.each(["321.webp","1024.webp","9999.webp","1600.webp","320.jpg","0320.webp","320.webp/extra","../320.webp","320.webp?x=1","640.WEBP",""])("deniega el nombre manipulado %s",async suffix=>{
    await expect(asRole(db,"authenticated",ownerA,"object.upload","insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)",[`${jobA}/${mediaA}/${suffix}`])).rejects.toMatchObject({code:"42501"});
  });
  it.each([`${jobA}/${mediaB}/390.webp`,`${jobB}/${mediaA}/640.webp`,`${jobB}/${mediaB}/768.webp`,`${jobA}/77777777-7777-4777-8777-777777777777/320.webp`])("deniega medio/job/propietario ajeno o inexistente %s",async path=>{
    await expect(asRole(db,"authenticated",ownerA,"object.upload","insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)",[path])).rejects.toMatchObject({code:"42501"});
  });
  it("anon no escribe y la lectura pública exige publicación y objeto existente",async()=>{
    for(const path of paths)await db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)",[path]);
    const unauthorized=[`${jobA}/${mediaA}/321.webp`,`${jobA}/${mediaA}/1024.webp`,`${jobA}/${mediaA}/9999.webp`,`${jobA}/${mediaA}/320.jpg`,`${jobA}/${mediaB}/390.webp`,`${jobB}/${mediaA}/640.webp`,`${jobB}/${mediaB}/768.webp`];
    // Existencia no equivale a autorización: sembrar objetos inválidos solo como
    // administrador del fixture efímero y verificar que RLS los oculta también.
    for(const path of unauthorized)await db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing",[path]);
    const read=(path:string,op="object.get_authenticated")=>asRole(db,"anon",null,op,"select name from storage.objects where name=$1",[path]);
    for(const path of paths)expect((await read(path)).rows).toHaveLength(0);
    await expect(asRole(db,"anon",null,"object.upload","insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)",[`${jobA}/${mediaA}/320.webp`])).rejects.toMatchObject({code:"42501"});
    await db.query("update public.jobs set is_public=true where id=$1",[jobA]);
    for(const path of paths){expect((await read(path)).rows).toHaveLength(1);expect((await read(path,"object.list")).rows).toHaveLength(0);expect((await read(path,"object.sign")).rows).toHaveLength(0);}
    for(const path of unauthorized)expect((await read(path)).rows).toHaveLength(0);
    await db.query("delete from storage.objects where name=$1",[paths[1]]);
    expect((await read(paths[1])).rows).toHaveLength(0);
    const projection=await asRole<{media:{id:string;path:string}[]}>(db,"anon",null,"","select * from public.list_public_jobs()");
    expect(projection.rows[0].media).toEqual([{id:mediaA,path:legacy,focal_x:50,focal_y:50}]);
    await db.query("update public.jobs set is_public=false where id=$1",[jobA]);
    for(const path of paths)expect((await read(path)).rows).toHaveLength(0);
  });
});
