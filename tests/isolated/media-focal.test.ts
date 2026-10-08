import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { setFocalPoint } from "@/features/jobs/data";
import { asRole, jobA, jobB, mediaA, mediaB, ownerA, ownerB } from "./database";
import { storageFixture } from "./storage-fixture";

// Ruta real (setFocalPoint → REST fixture → PostgreSQL con RLS, grants y CHECK de las migraciones).
let fixture: Awaited<ReturnType<typeof storageFixture>>;
beforeAll(async () => { fixture = await storageFixture(); });
afterAll(async () => { await fixture?.close(); });
const focal = async (id: string) => (await fixture.db.query<{ focal_x: number; focal_y: number }>("select focal_x, focal_y from public.job_media where id=$1", [id])).rows[0];
const as = (role: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = []) => asRole<Record<string, unknown>>(fixture.db, role, uid, "", sql, params);

describe("punto focal de job_media", () => {
  it("las fotos existentes se comportan como antes: centro 50/50 por defecto", async () => {
    expect(await focal(mediaA)).toEqual({ focal_x: 50, focal_y: 50 });
    expect(await focal(mediaB)).toEqual({ focal_x: 50, focal_y: 50 });
  });
  it("guarda, cambia de nuevo y restablece al centro sin tocar Storage", async () => {
    const client = fixture.client(ownerA);
    fixture.files.set("portfolio-derivatives/x", { bytes: Buffer.from("x"), type: "image/webp" });
    const before = [...fixture.files.keys()]; fixture.calls.length = 0;
    await setFocalPoint(client, ownerA, jobA, mediaA, { focal_x: 80, focal_y: 20 });
    expect(await focal(mediaA)).toEqual({ focal_x: 80, focal_y: 20 });
    await setFocalPoint(client, ownerA, jobA, mediaA, { focal_x: 0, focal_y: 100 });
    expect(await focal(mediaA)).toEqual({ focal_x: 0, focal_y: 100 });
    await setFocalPoint(client, ownerA, jobA, mediaA, { focal_x: 50, focal_y: 50 });
    expect(await focal(mediaA)).toEqual({ focal_x: 50, focal_y: 50 });
    expect([...fixture.files.keys()]).toEqual(before);
    expect(fixture.calls).toHaveLength(0);
  });
  it("funciona también con el trabajo publicado y no cambia su publicación", async () => {
    await fixture.db.query("update public.jobs set is_public=true where id=$1", [jobA]);
    await setFocalPoint(fixture.client(ownerA), ownerA, jobA, mediaA, { focal_x: 30, focal_y: 70 });
    expect((await fixture.db.query<{ is_public: boolean }>("select is_public from public.jobs where id=$1", [jobA])).rows[0].is_public).toBe(true);
    await fixture.db.query("update public.jobs set is_public=false where id=$1", [jobA]);
  });
  it("otro propietario no puede cambiar el encuadre ajeno", async () => {
    await setFocalPoint(fixture.client(ownerA), ownerA, jobA, mediaA, { focal_x: 10, focal_y: 90 });
    await expect(setFocalPoint(fixture.client(ownerB), ownerB, jobA, mediaA, { focal_x: 99, focal_y: 1 })).rejects.toThrow();
    await expect(setFocalPoint(fixture.client(ownerB), ownerB, jobB, mediaA, { focal_x: 99, focal_y: 1 })).rejects.toThrow();
    expect(await focal(mediaA)).toEqual({ focal_x: 10, focal_y: 90 });
    expect((await as("authenticated", ownerB, "update public.job_media set focal_x=1 where id=$1 returning id", [mediaA])).rows).toHaveLength(0);
  });
  it.each([{ focal_x: -1, focal_y: 50 }, { focal_x: 101, focal_y: 50 }, { focal_x: 50.5, focal_y: 50 }, { focal_x: "50", focal_y: 50 }, { focal_x: 50 }, { focal_x: 50, focal_y: 50, position: 3 }, null])("rechaza un encuadre inválido %j", async (input) => {
    await expect(setFocalPoint(fixture.client(ownerA), ownerA, jobA, mediaA, input)).rejects.toThrow();
  });
  it("la base de datos también valida el rango", async () => {
    for (const sql of ["update public.job_media set focal_x=-1 where id=$1", "update public.job_media set focal_y=101 where id=$1"])
      await expect(as("authenticated", ownerA, sql, [mediaA])).rejects.toMatchObject({ code: "23514" });
  });
});

describe("contrato público del punto focal", () => {
  const publicRows = async () => (await as("anon", null, "select * from public.list_public_jobs()")).rows;
  it("anon solo recibe el punto focal de medios de trabajos publicados con derivado preparado", async () => {
    await fixture.db.query("update public.job_media set focal_x=25, focal_y=75 where id=$1", [mediaA]);
    await fixture.db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${mediaA}.webp`]);
    await fixture.db.query("update public.jobs set is_public=false where id=$1", [jobA]);
    expect(JSON.stringify(await publicRows())).not.toContain(mediaA);
    await fixture.db.query("update public.jobs set is_public=true where id=$1", [jobA]);
    const row = (await publicRows()).find(item => item.id === jobA)!;
    expect(row.media).toEqual([{ id: mediaA, path: `${jobA}/${mediaA}.webp`, focal_x: 25, focal_y: 75 }]);
    expect(JSON.stringify(await publicRows())).not.toContain(mediaB);
    await fixture.db.query("update public.jobs set is_public=false where id=$1", [jobA]);
  });
  it("anon no lee job_media directamente ni puede modificar el encuadre", async () => {
    await expect(as("anon", null, "select focal_x from public.job_media")).rejects.toMatchObject({ code: "42501" });
    await expect(as("anon", null, "update public.job_media set focal_x=1")).rejects.toMatchObject({ code: "42501" });
  });
});
