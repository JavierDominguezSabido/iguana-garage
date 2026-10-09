import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { asRole, isolatedDatabase, jobA, jobB, mediaA, ownerA, ownerB } from "./database";

// PostgreSQL aislado con las migraciones reales: RLS, grants por columna y proyección pública.
let db: PGlite;
beforeAll(async()=>{db=await isolatedDatabase();});
afterAll(async()=>{await db?.close();});
const as=(role:"anon"|"authenticated",uid:string|null,sql:string,params:unknown[]=[])=>asRole<Record<string,unknown>>(db,role,uid,"",sql,params);
const setFields=(uid:string,id:string,hours:number|null,description:string|null)=>as("authenticated",uid,"update public.jobs set work_hours=$1,description=$2 where id=$3 returning work_hours,description",[hours,description,id]);

describe("horas de trabajo y descripción: propietario y aislamiento",()=>{
  it("el propietario crea un trabajo con horas y descripción y lo lee con valores exactos",async()=>{
    const id="77777777-7777-4777-8777-777777777777";
    await as("authenticated",ownerA,"insert into public.jobs(id,owner_id,name,job_date,work_hours,description) values ($1,$2,'Con datos','2026-10-08',12.5,'Reparación de paragolpes trasero y pintura.')",[id,ownerA]);
    const row=(await as("authenticated",ownerA,"select work_hours,description,is_public from public.jobs where id=$1",[id])).rows[0];
    expect(Number(row.work_hours)).toBe(12.5);
    expect(String(row.work_hours)).toBe("12.50");
    expect(row.description).toBe("Reparación de paragolpes trasero y pintura.");
    expect(row.is_public).toBe(false);
  });
  it("el propietario edita y borra ambos campos",async()=>{
    expect(Number((await setFields(ownerA,jobA,8.25,"Preparación de aleta, reparación y acabado.")).rows[0].work_hours)).toBe(8.25);
    expect((await setFields(ownerA,jobA,null,null)).rows[0]).toEqual({work_hours:null,description:null});
  });
  it("otro usuario no lee ni modifica horas o descripción ajenas",async()=>{
    await setFields(ownerA,jobA,3,"Privado de A");
    expect((await as("authenticated",ownerB,"select work_hours,description from public.jobs where id=$1",[jobA])).rows).toHaveLength(0);
    expect((await setFields(ownerB,jobA,99,"Ataque")).rows).toHaveLength(0);
    const stored=(await db.query<{work_hours:string;description:string}>("select work_hours,description from public.jobs where id=$1",[jobA])).rows[0];
    expect([Number(stored.work_hours),stored.description]).toEqual([3,"Privado de A"]);
    await expect(as("authenticated",ownerB,"insert into public.jobs(owner_id,name,job_date,work_hours) values ($1,'Suplantación','2026-10-08',1)",[ownerA])).rejects.toMatchObject({code:"42501"});
  });
  it("un trabajo sin horas ni descripción es válido",async()=>{
    const row=(await as("authenticated",ownerB,"select work_hours,description from public.jobs where id=$1",[jobB])).rows[0];
    expect(row).toEqual({work_hours:null,description:null});
  });
});

describe("restricciones del esquema",()=>{
  it.each([["horas negativas","update public.jobs set work_hours=-0.01 where id=$1","23514"],
    ["horas no numéricas","update public.jobs set work_hours='NaN'::numeric where id=$1","23514"],
    ["horas fuera de rango","update public.jobs set work_hours=1000 where id=$1","22003"],
    ["descripción vacía","update public.jobs set description='' where id=$1","23514"],
    ["descripción sin recortar","update public.jobs set description=' texto ' where id=$1","23514"],
    ["descripción de 501 caracteres","update public.jobs set description=repeat('x',501) where id=$1","23514"]])("rechaza %s",async(_name,sql,code)=>{
    await expect(as("authenticated",ownerA,sql,[jobA])).rejects.toMatchObject({code});
  });
  it("acepta los límites exactos",async()=>{
    expect((await as("authenticated",ownerA,"update public.jobs set work_hours=0,description=repeat('x',500) where id=$1 returning 1 as ok",[jobA])).rows).toHaveLength(1);
    expect((await as("authenticated",ownerA,"update public.jobs set work_hours=999.99 where id=$1 returning 1 as ok",[jobA])).rows).toHaveLength(1);
  });
});

describe("privacidad frente a anon y proyección pública",()=>{
  it("anon no puede leer ni escribir ninguna columna de jobs",async()=>{
    for(const sql of ["select work_hours from public.jobs","select description from public.jobs","select * from public.jobs"])
      await expect(as("anon",null,sql)).rejects.toMatchObject({code:"42501"});
    await expect(as("anon",null,"update public.jobs set description='x'")).rejects.toMatchObject({code:"42501"});
  });
  it("la descripción solo es pública con is_public=true y las horas jamás aparecen",async()=>{
    await setFields(ownerA,jobA,12.5,"Descripción pública de prueba.");
    await db.query("update public.jobs set is_public=false where id=$1",[jobA]);
    expect((await as("anon",null,"select * from public.list_public_jobs()")).rows.filter(row=>row.id===jobA)).toHaveLength(0);
    // Sin ninguna foto visible (con derivado) un trabajo no tiene banda en el muro: se publica una foto en el fixture.
    await db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing",[`${jobA}/${mediaA}.webp`]);
    await db.query("update public.jobs set is_public=true where id=$1",[jobA]);
    const rows=(await as("anon",null,"select * from public.list_public_jobs()")).rows;
    const row=rows.find(item=>item.id===jobA)!;
    expect(row.description).toBe("Descripción pública de prueba.");
    expect(Object.keys(row).sort()).toEqual(["description","id","job_date","media","name"]);
    expect(JSON.stringify(rows)).not.toMatch(/work_hours|paint_code|owner_id|12\.5/);
    await db.query("update public.jobs set is_public=false where id=$1",[jobA]);
    expect((await as("anon",null,"select * from public.list_public_jobs()")).rows.filter(item=>item.id===jobA)).toHaveLength(0);
  });
  it("un trabajo publicado sin descripción devuelve null",async()=>{
    await setFields(ownerA,jobA,5,null);
    // Sin ninguna foto visible (con derivado) un trabajo no tiene banda en el muro: se publica una foto en el fixture.
    await db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing",[`${jobA}/${mediaA}.webp`]);
    await db.query("update public.jobs set is_public=true where id=$1",[jobA]);
    const row=(await as("anon",null,"select * from public.list_public_jobs()")).rows.find(item=>item.id===jobA)!;
    expect(row.description).toBeNull();
    await db.query("update public.jobs set is_public=false where id=$1",[jobA]);
  });
  it("un usuario autenticado tampoco recibe horas ajenas por la proyección pública",async()=>{
    await setFields(ownerA,jobA,7,"Pública");
    await db.query("update public.jobs set is_public=true where id=$1",[jobA]);
    const rows=(await as("authenticated",ownerB,"select * from public.list_public_jobs()")).rows;
    expect(JSON.stringify(rows)).not.toMatch(/work_hours/);
    await db.query("update public.jobs set is_public=false where id=$1",[jobA]);
  });
});
