import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { portadaJobs, reorderPhotos, setFeaturedTransformation, setPhotoHidden, setPinnedJob, setPublished } from "@/features/jobs/curation";
import { asRole, jobA, jobB, mediaA, mediaB, ownerA, ownerB } from "./database";
import { storageFixture } from "./storage-fixture";

// Ruta real: DAL → REST fixture → PostgreSQL con RLS, grants, UNIQUE (job_id, position) y funciones de las migraciones.
let fixture: Awaited<ReturnType<typeof storageFixture>>;
const mediaA2 = "77777777-7777-4777-8777-777777777777";
const mediaA3 = "88888888-8888-4888-8888-888888888888";
const jobC = "99999999-9999-4999-8999-999999999999";
const mediaC = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const jobD = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const mediaD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const sidecars = (job: string, media: string) => [`${job}/${media}.webp`, ...[320, 390, 640, 768].map(width => `${job}/${media}/${width}.webp`)];

const q = (sql: string, params: unknown[] = []) => fixture.db.query<Record<string, unknown>>(sql, params);
const as = (role: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = [], operation = "") => asRole<Record<string, unknown>>(fixture.db, role, uid, operation, sql, params);
const order = async (job: string) => (await q("select id from public.job_media where job_id=$1 order by position", [job])).rows.map(row => row.id as string);
const positions = async (job: string) => (await q("select position from public.job_media where job_id=$1 order by position", [job])).rows.map(row => row.position as number);
const listed = async (limit = 50, offset = 0) => (await as("anon", null, "select id, media from public.list_public_jobs($1,$2)", [limit, offset])).rows as { id: string; media: { id: string }[] }[];
const featured = async () => (await as("anon", null, "select * from public.get_featured_transformation()")).rows;
const canDownload = async (path: string) => (await as("anon", null, "select name from storage.objects where name=$1", [path], "object.get_authenticated")).rows.length === 1;
async function addMedia(job: string, owner: string, media: string, position: number) {
  await q("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',$4,1,1,1)", [media, job, `${owner}/${job}/${media}.png`, position]);
  for (const path of sidecars(job, media)) await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [path]);
}
async function resetJobA() {
  await q("delete from public.portfolio_settings");
  await q("drop trigger if exists boom on public.job_media");
  await q("delete from public.job_media where job_id=$1", [jobA]);
  await addMedia(jobA, ownerA, mediaA, 0); await addMedia(jobA, ownerA, mediaA2, 1); await addMedia(jobA, ownerA, mediaA3, 2);
}
beforeAll(async () => {
  fixture = await storageFixture();
  await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Trabajo C','2026-10-20'),($3,$2,'Trabajo D','2026-10-01')", [jobC, ownerA, jobD]);
  await addMedia(jobC, ownerA, mediaC, 0); await addMedia(jobD, ownerA, mediaD, 0);
  await q("delete from public.job_media where job_id=$1", [jobA]);
});
afterAll(async () => { await fixture?.close(); });
beforeEach(async () => { await resetJobA(); await q("update public.jobs set is_public=false"); await q("update public.job_media set hidden_from_home=false"); });

describe("reordenar fotos de forma atómica (reorder_job_media)", () => {
  const client = () => fixture.client(ownerA);
  it("aplica cualquier permutación respetando UNIQUE (job_id, position) y deja posiciones 0..n-1", async () => {
    const all = [mediaA, mediaA2, mediaA3];
    const perms = [[mediaA3, mediaA, mediaA2], [mediaA3, mediaA2, mediaA], [mediaA2, mediaA, mediaA3], [mediaA, mediaA3, mediaA2], all];
    for (const next of perms) {
      await reorderPhotos(client(), ownerA, jobA, next);
      expect(await order(jobA)).toEqual(next);
      expect(await positions(jobA)).toEqual([0, 1, 2]);
    }
  });
  it("normaliza los huecos que deja borrar una foto", async () => {
    await q("delete from public.job_media where id=$1", [mediaA2]);
    expect(await positions(jobA)).toEqual([0, 2]);
    await reorderPhotos(client(), ownerA, jobA, [mediaA3, mediaA]);
    expect(await order(jobA)).toEqual([mediaA3, mediaA]);
    expect(await positions(jobA)).toEqual([0, 1]);
  });
  it("se aplica al muro público, también con el trabajo publicado, sin cambiar su publicación", async () => {
    await q("update public.jobs set is_public=true where id=$1", [jobA]);
    await reorderPhotos(client(), ownerA, jobA, [mediaA3, mediaA2, mediaA]);
    expect((await listed())[0].media.map(photo => photo.id)).toEqual([mediaA3, mediaA2, mediaA]);
    expect((await q("select is_public from public.jobs where id=$1", [jobA])).rows[0].is_public).toBe(true);
  });
  it.each([
    ["falta una foto", () => [mediaA, mediaA2]],
    ["sobra una foto", () => [mediaA, mediaA2, mediaA3, mediaC]],
    ["foto repetida", () => [mediaA, mediaA, mediaA2]],
    ["foto de otro trabajo", () => [mediaA, mediaA2, mediaB]],
    ["lista vacía", () => []],
  ])("rechaza un orden inválido (%s) y no cambia nada", async (_label, input) => {
    await expect(reorderPhotos(client(), ownerA, jobA, input())).rejects.toMatchObject({ status: 409 });
    expect(await order(jobA)).toEqual([mediaA, mediaA2, mediaA3]);
    expect(await positions(jobA)).toEqual([0, 1, 2]);
  });
  it("una subida concurrente (conjunto distinto) da 409 sin tocar el orden", async () => {
    await addMedia(jobA, ownerA, "dddddddd-dddd-4ddd-8ddd-dddddddddddd", 3);
    await expect(reorderPhotos(client(), ownerA, jobA, [mediaA3, mediaA2, mediaA])).rejects.toMatchObject({ status: 409 });
    expect(await positions(jobA)).toEqual([0, 1, 2, 3]);
    await q("delete from public.job_media where id='dddddddd-dddd-4ddd-8ddd-dddddddddddd'");
  });
  it("es atómico: si falla a mitad, el orden anterior queda intacto", async () => {
    await q(`create or replace function public.zz_boom() returns trigger language plpgsql as $$ begin if new.position = 1 and old.position >= 3 then raise exception 'boom'; end if; return new; end $$`);
    await q("create trigger boom before update on public.job_media for each row execute function public.zz_boom()");
    await expect(reorderPhotos(client(), ownerA, jobA, [mediaA3, mediaA2, mediaA])).rejects.toMatchObject({ status: 503 });
    expect(await order(jobA)).toEqual([mediaA, mediaA2, mediaA3]);
    expect(await positions(jobA)).toEqual([0, 1, 2]);
    await q("drop trigger boom on public.job_media");
  });
  it("otro propietario no puede reordenar; anon no puede ejecutar la función", async () => {
    await expect(reorderPhotos(fixture.client(ownerB), ownerB, jobA, [mediaA3, mediaA2, mediaA])).rejects.toMatchObject({ status: 404 });
    await expect(as("authenticated", ownerB, "select public.reorder_job_media($1,$2::uuid[])", [jobA, [mediaA3, mediaA2, mediaA]])).rejects.toMatchObject({ code: "P0002" });
    await expect(as("anon", null, "select public.reorder_job_media($1,$2::uuid[])", [jobA, [mediaA3, mediaA2, mediaA]])).rejects.toMatchObject({ code: "42501" });
    expect(await order(jobA)).toEqual([mediaA, mediaA2, mediaA3]);
  });
});

describe("muro: un trabajo sin ninguna foto visible no tiene banda", () => {
  it("excluye trabajos con todas las fotos ocultas o sin fotos, y la paginación no deja huecos", async () => {
    await q("update public.jobs set is_public=true where id in ($1,$2,$3)", [jobA, jobC, jobD]);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobA, jobD]);
    await q("update public.job_media set hidden_from_home=true where job_id=$1", [jobA]);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobD]);
    expect((await listed(1, 0)).map(job => job.id)).toEqual([jobC]);
    expect((await listed(1, 1)).map(job => job.id)).toEqual([jobD]);
    expect(await listed(1, 2)).toEqual([]);
    await q("update public.job_media set hidden_from_home=false where job_id=$1", [jobA]);
    await q("delete from public.job_media where job_id=$1", [jobA]);
    expect((await listed()).map(job => job.id)).toEqual([jobC, jobD]);
  });
  it("el fijado sin fotos visibles tampoco aparece", async () => {
    await q("update public.jobs set is_public=true where id in ($1,$2)", [jobA, jobC]);
    await setPinnedJob(fixture.client(ownerA), ownerA, jobA);
    expect((await listed()).map(job => job.id)).toEqual([jobA, jobC]);
    await q("update public.job_media set hidden_from_home=true where job_id=$1", [jobA]);
    expect((await listed()).map(job => job.id)).toEqual([jobC]);
  });
});

describe("fotos solo para la portada", () => {
  const client = () => fixture.client(ownerA);
  beforeEach(async () => { await q("update public.jobs set is_public=true where id=$1", [jobA]); });
  it("una foto oculta del muro sale en el comparador y su visor, no en el muro, ordenada por posición", async () => {
    await setPhotoHidden(client(), ownerA, jobA, mediaA, true);
    await setPhotoHidden(client(), ownerA, jobA, mediaA3, true);
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA, after_id: mediaA2 });
    const rows = await featured();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: jobA, before_id: mediaA, after_id: mediaA2 });
    expect((rows[0].media as { id: string }[]).map(photo => photo.id)).toEqual([mediaA, mediaA2]);
    expect((await listed())[0].media.map(photo => photo.id)).toEqual([mediaA2]);
    expect(JSON.stringify(rows)).not.toMatch(/hidden|owner_id/);
  });
  it("se puede descargar públicamente (master y sidecars) solo mientras esté destacada y el trabajo publicado", async () => {
    await setPhotoHidden(client(), ownerA, jobA, mediaA, true);
    await setPhotoHidden(client(), ownerA, jobA, mediaA3, true);
    for (const path of [...sidecars(jobA, mediaA), ...sidecars(jobA, mediaA3)]) expect(await canDownload(path)).toBe(false);
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA, after_id: mediaA2 });
    for (const path of sidecars(jobA, mediaA)) expect(await canDownload(path)).toBe(true);
    for (const path of sidecars(jobA, mediaA3)) expect(await canDownload(path)).toBe(false);
    // Sustituir la pareja revoca la anterior y concede la nueva al instante.
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA3, after_id: mediaA2 });
    for (const path of sidecars(jobA, mediaA)) expect(await canDownload(path)).toBe(false);
    for (const path of sidecars(jobA, mediaA3)) expect(await canDownload(path)).toBe(true);
    // Quitar de portada la revoca.
    await setFeaturedTransformation(client(), ownerA, null);
    for (const path of sidecars(jobA, mediaA3)) expect(await canDownload(path)).toBe(false);
    // Despublicar la revoca aunque siga seleccionada.
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA3, after_id: mediaA2 });
    expect(await canDownload(`${jobA}/${mediaA3}.webp`)).toBe(true);
    await q("update public.jobs set is_public=false where id=$1", [jobA]);
    expect(await canDownload(`${jobA}/${mediaA3}.webp`)).toBe(false);
    expect(await featured()).toEqual([]);
  });
  it("si el compañero pierde su derivado la portada no se muestra y la foto oculta deja de ser pública", async () => {
    await setPhotoHidden(client(), ownerA, jobA, mediaA, true);
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA, after_id: mediaA2 });
    expect(await canDownload(`${jobA}/${mediaA}.webp`)).toBe(true);
    await q("delete from storage.objects where name=$1", [`${jobA}/${mediaA2}.webp`]);
    expect(await featured()).toEqual([]);
    expect(await canDownload(`${jobA}/${mediaA}.webp`)).toBe(false);
  });
  it("borrar una foto de la pareja revoca la otra foto oculta", async () => {
    await setPhotoHidden(client(), ownerA, jobA, mediaA, true);
    await setFeaturedTransformation(client(), ownerA, { job_id: jobA, before_id: mediaA, after_id: mediaA2 });
    await q("delete from public.job_media where id=$1", [mediaA2]);
    expect(await canDownload(`${jobA}/${mediaA}.webp`)).toBe(false);
    expect(await featured()).toEqual([]);
  });
  it("el propietario sigue leyendo sus fotos ocultas y una foto visible sigue pública", async () => {
    await setPhotoHidden(client(), ownerA, jobA, mediaA3, true);
    expect((await as("authenticated", ownerA, "select name from storage.objects where name=$1", [`${jobA}/${mediaA3}.webp`], "object.get_authenticated")).rows).toHaveLength(1);
    expect(await canDownload(`${jobA}/${mediaA2}.webp`)).toBe(true);
    expect(await canDownload(`${jobA}/${mediaA3}.webp`)).toBe(false);
  });
});

describe("publicar desde la pantalla «Portada» y orden de la pantalla", () => {
  const client = () => fixture.client(ownerA);
  it("publica y despublica por la misma vía que el formulario (comprueba derivados)", async () => {
    await setPublished(client(), ownerA, jobA, true);
    expect((await q("select is_public from public.jobs where id=$1", [jobA])).rows[0].is_public).toBe(true);
    await setPublished(client(), ownerA, jobA, true);
    await setPublished(client(), ownerA, jobA, false);
    expect((await q("select is_public from public.jobs where id=$1", [jobA])).rows[0].is_public).toBe(false);
    await expect(setPublished(fixture.client(ownerB), ownerB, jobA, true)).rejects.toMatchObject({ status: 404 });
  });
  it("si una foto sigue incompleta, el trabajo permanece privado", async () => {
    await q("delete from storage.objects where name=$1", [`${jobA}/${mediaA2}.webp`]);
    await expect(setPublished(client(), ownerA, jobA, true)).rejects.toMatchObject({ status: 503 });
    expect((await q("select is_public from public.jobs where id=$1", [jobA])).rows[0].is_public).toBe(false);
    await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${jobA}/${mediaA2}.webp`]);
  });
  it("lista publicados (fijado primero, fecha y UUID) y privados al final, con paginación", async () => {
    await q("update public.jobs set is_public=true where id in ($1,$2)", [jobA, jobC]);
    await setPinnedJob(client(), ownerA, jobA);
    const page = await portadaJobs(client(), ownerA, 1);
    expect(page.jobs.map(entry => entry.job.id)).toEqual([jobA, jobC, jobD]);
    expect(page.jobs.map(entry => entry.job.is_public)).toEqual([true, true, false]);
    expect(page.jobs[0].media.map(photo => photo.id)).toEqual([mediaA, mediaA2, mediaA3]);
    expect(page.hasNext).toBe(false);
    expect(page.settings?.pinned_job_id).toBe(jobA);
    expect((await portadaJobs(client(), ownerA, 2)).jobs).toEqual([]);
    expect((await portadaJobs(fixture.client(ownerB), ownerB, 1)).jobs.map(entry => entry.job.id)).toEqual([jobB]);
  });
});
