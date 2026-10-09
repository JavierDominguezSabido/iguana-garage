import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
vi.mock("server-only", () => ({}));
import { finishJob, prepareJob } from "@/features/jobs/data";
import { moveWallJob, portadaJobs, setFeaturedTransformation, setPublished } from "@/features/jobs/curation";
import { asRole, isolatedDatabase, jobA, jobB, mediaA, mediaB, ownerA, ownerB } from "./database";
import { storageFixture } from "./storage-fixture";

// Orden manual de los trabajos: relleno de la migración, trigger de «entra arriba», move_wall_job y proyección pública.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const migration = () => readFile("supabase/migrations/20261012120000_wall_job_order.sql", "utf8");

describe("migración: conserva el orden actual del muro", () => {
  it("el fijado primero y después por fecha/UUID; privados sin posición; cada propietario por separado", async () => {
    const db = await isolatedDatabase({ withWallOrder: false });
    await db.exec("delete from public.job_media; delete from public.jobs");
    const rows: [number, string, string, boolean][] = [
      [1, ownerA, "2026-03-01", true], [2, ownerA, "2026-03-01", true], [3, ownerA, "2026-05-01", true], [4, ownerA, "2026-01-01", true],
      [5, ownerA, "2026-06-01", false], [6, ownerB, "2026-02-01", true], [7, ownerB, "2026-04-01", true],
    ];
    for (const [n, owner, date, pub] of rows) {
      await db.query("insert into public.jobs(id,owner_id,name,job_date,is_public) values ($1,$2,$3,$4,$5)", [uuid(n), owner, `Trabajo ${n}`, date, pub]);
      await db.query("insert into public.job_media(id,job_id,storage_path,mime_type,position) values ($1,$2,$3,'image/png',0)", [uuid(100 + n), uuid(n), `${owner}/${uuid(n)}/${uuid(100 + n)}.png`]);
      await db.query("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)", [`${uuid(n)}/${uuid(100 + n)}.webp`]);
    }
    await db.query("insert into public.portfolio_settings(owner_id,pinned_job_id) values ($1,$2)", [ownerA, uuid(4)]);
    // Orden que el muro ofrecía antes de la migración (la proyección anterior ordenaba por el fijado y la fecha).
    const list = async () => (await db.query<{ id: string }>("select id from public.list_public_jobs(50,0)")).rows.map(row => row.id);
    const ownerOf = (id: string) => rows.find(item => uuid(item[0]) === id)![1];
    const before = await list();
    await db.exec(await migration());
    const after = await list();
    // Con un único propietario el orden del muro es idéntico; con varios, se conserva el orden relativo de cada uno.
    for (const owner of [ownerA, ownerB]) expect(after.filter(id => ownerOf(id) === owner)).toEqual(before.filter(id => ownerOf(id) === owner));
    expect(after).toHaveLength(before.length);
    const positions = (await db.query<{ id: string; wall_position: number | null }>("select id, wall_position from public.jobs order by owner_id, wall_position nulls last, id")).rows;
    const byOwner = (owner: string) => positions.filter(row => rows.find(item => uuid(item[0]) === row.id)![1] === owner);
    expect(byOwner(ownerA).map(row => [row.id, row.wall_position])).toEqual([[uuid(4), 0], [uuid(3), 1], [uuid(1), 2], [uuid(2), 3], [uuid(5), null]]);
    expect(byOwner(ownerB).map(row => [row.id, row.wall_position])).toEqual([[uuid(7), 0], [uuid(6), 1]]);
    await db.close();
  });
});

describe("orden manual de los trabajos", () => {
  let fixture: Awaited<ReturnType<typeof storageFixture>>;
  const q = (sql: string, params: unknown[] = []) => fixture.db.query<Record<string, unknown>>(sql, params);
  const as = (role: "anon" | "authenticated", uid: string | null, sql: string, params: unknown[] = []) => asRole<Record<string, unknown>>(fixture.db, role, uid, "", sql, params);
  const client = () => fixture.client(ownerA);
  const wall = async () => (await q("select id from public.jobs where owner_id=$1 and is_public order by wall_position, job_date desc, id", [ownerA])).rows.map(row => row.id as string);
  const positions = async () => (await q("select wall_position from public.jobs where owner_id=$1 and is_public order by wall_position", [ownerA])).rows.map(row => row.wall_position as number);
  const listed = async (limit = 100, offset = 0) => (await as("anon", null, "select id from public.list_public_jobs($1,$2)", [limit, offset])).rows.map(row => row.id as string);
  async function makeJob(n: number, owner = ownerA, date = "2026-01-01", withPhoto = true) {
    await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,$3,$4)", [uuid(n), owner, `Trabajo ${n}`, date]);
    if (withPhoto) {
      await q("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',0,1,1,1)", [uuid(1000 + n), uuid(n), `${owner}/${uuid(n)}/${uuid(1000 + n)}.png`]);
      await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1) on conflict do nothing", [`${uuid(n)}/${uuid(1000 + n)}.webp`]);
    }
  }
  const publish = (...ns: number[]) => ns.reduce((chain, n) => chain.then(() => q("update public.jobs set is_public=true where id=$1", [uuid(n)]).then(() => undefined)), Promise.resolve());

  beforeAll(async () => { fixture = await storageFixture(); await q("delete from public.job_media"); await q("delete from public.jobs"); await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Fixture A','2026-10-07'),($3,$4,'Fixture B','2026-10-07')", [jobA, ownerA, jobB, ownerB]); });
  afterAll(async () => { await fixture?.close(); });
  beforeEach(async () => { await q("delete from public.portfolio_settings"); await q("delete from public.job_media"); await q("delete from public.jobs"); await q("delete from storage.objects where bucket_id='portfolio-derivatives'"); await q("insert into public.jobs(id,owner_id,name,job_date) values ($1,$2,'Fixture B','2026-10-07')", [jobB, ownerB]); });

  describe("un trabajo que se publica entra arriba del todo", () => {
    it("el último publicado va primero, sea cual sea su fecha, y los privados no tienen posición", async () => {
      for (const [n, date] of [[1, "2026-01-01"], [2, "2026-09-01"], [3, "2026-05-01"]] as const) await makeJob(n, ownerA, date);
      await makeJob(4);
      await publish(1, 2, 3);
      expect(await wall()).toEqual([uuid(3), uuid(2), uuid(1)]);
      expect((await q("select wall_position from public.jobs where id=$1", [uuid(4)])).rows[0].wall_position).toBeNull();
      expect(await listed()).toEqual([uuid(3), uuid(2), uuid(1)]);
    });
    it("un trabajo creado ya publicado también entra arriba y otro propietario no altera el orden", async () => {
      await makeJob(1); await publish(1);
      await q("insert into public.jobs(id,owner_id,name,job_date,is_public) values ($1,$2,'Nuevo','2026-01-01',true)", [uuid(2), ownerA]);
      expect(await wall()).toEqual([uuid(2), uuid(1)]);
      await q("update public.jobs set is_public=true where id=$1", [jobB]);
      expect(await wall()).toEqual([uuid(2), uuid(1)]);
      expect((await q("select wall_position from public.jobs where id=$1", [jobB])).rows[0].wall_position).toBe(0);
    });
    it("editar un trabajo publicado (despublicación temporal de prepareJob + finishJob) conserva su posición", async () => {
      for (const n of [1, 2, 3]) await makeJob(n);
      await publish(1, 2, 3);
      await moveWallJob(client(), ownerA, uuid(3), 2);
      expect(await wall()).toEqual([uuid(2), uuid(1), uuid(3)]);
      const input = { name: "Trabajo 3 corregido", job_date: "2026-01-01", paint_code: null, work_hours: null, description: null, is_public: true };
      await prepareJob(client(), ownerA, uuid(3), input, false);
      expect((await q("select is_public, wall_position from public.jobs where id=$1", [uuid(3)])).rows[0]).toMatchObject({ is_public: false, wall_position: 2 });
      await finishJob(client(), ownerA, uuid(3), input);
      expect(await wall()).toEqual([uuid(2), uuid(1), uuid(3)]);
    });
    it("despublicar de verdad limpia la posición y al republicar vuelve arriba (formulario y Portada)", async () => {
      for (const n of [1, 2, 3]) await makeJob(n);
      await publish(1, 2, 3);
      await moveWallJob(client(), ownerA, uuid(1), 2);
      expect(await wall()).toEqual([uuid(3), uuid(2), uuid(1)]);
      await setPublished(client(), ownerA, uuid(1), false);
      expect((await q("select wall_position from public.jobs where id=$1", [uuid(1)])).rows[0].wall_position).toBeNull();
      await setPublished(client(), ownerA, uuid(1), true);
      expect(await wall()).toEqual([uuid(1), uuid(3), uuid(2)]);
      const input = { name: "Trabajo 2", job_date: "2026-01-01", paint_code: null, work_hours: null, description: null, is_public: false };
      await prepareJob(client(), ownerA, uuid(2), input, false);
      await finishJob(client(), ownerA, uuid(2), input);
      expect((await q("select wall_position from public.jobs where id=$1", [uuid(2)])).rows[0].wall_position).toBeNull();
      await finishJob(client(), ownerA, uuid(2), { ...input, is_public: true });
      expect((await wall())[0]).toBe(uuid(2));
    });
    it("la app antigua (solo is_public) sigue funcionando: republicar conserva el sitio", async () => {
      for (const n of [1, 2]) await makeJob(n);
      await publish(1, 2);
      await q("update public.jobs set is_public=false where id=$1", [uuid(1)]);
      await q("update public.jobs set is_public=true where id=$1", [uuid(1)]);
      expect(await wall()).toEqual([uuid(2), uuid(1)]);
    });
  });

  describe("mover un trabajo (move_wall_job)", () => {
    beforeEach(async () => { for (const n of [1, 2, 3, 4]) await makeJob(n); await publish(1, 2, 3, 4); await makeJob(9); });
    it.each([[uuid(4), 3, [1, 2, 3, 4]], [uuid(1), 0, [1, 2, 3, 4]], [uuid(1), 3, [2, 3, 4, 1]], [uuid(2), 1, [4, 2, 3, 1]], [uuid(3), 2, [4, 3, 2, 1]]])("mueve %s a la posición %i y deja posiciones 0..n-1", async (job, to) => {
      const before = await wall();
      await moveWallJob(client(), ownerA, job, to);
      const after = await wall();
      expect(after[to]).toBe(job);
      expect(after.filter(id => id !== job)).toEqual(before.filter(id => id !== job));
      expect(await positions()).toEqual([0, 1, 2, 3]);
      expect(await listed()).toEqual(after);
    });
    it("rechaza posiciones inexistentes, trabajos privados y ajenos sin cambiar nada", async () => {
      const before = await wall();
      await expect(moveWallJob(client(), ownerA, uuid(1), 4)).rejects.toMatchObject({ status: 409 });
      await expect(moveWallJob(client(), ownerA, uuid(1), -1)).rejects.toMatchObject({ status: 409 });
      await expect(moveWallJob(client(), ownerA, uuid(9), 0)).rejects.toMatchObject({ status: 409 });
      await expect(moveWallJob(fixture.client(ownerB), ownerB, uuid(1), 0)).rejects.toMatchObject({ status: 404 });
      await expect(as("authenticated", ownerB, "select public.move_wall_job($1,0)", [uuid(1)])).rejects.toMatchObject({ code: "P0002" });
      await expect(as("anon", null, "select public.move_wall_job($1,0)", [uuid(1)])).rejects.toMatchObject({ code: "42501" });
      expect(await wall()).toEqual(before);
    });
    it("es atómico: si falla a mitad, el orden anterior queda intacto", async () => {
      const before = await wall(); const beforePositions = await positions();
      await q(`create or replace function public.zz_boom() returns trigger language plpgsql as $$ begin if new.id = '${uuid(3)}' and new.wall_position is distinct from old.wall_position then raise exception 'boom'; end if; return new; end $$`);
      await q("create trigger boom before update on public.jobs for each row execute function public.zz_boom()");
      await expect(moveWallJob(client(), ownerA, uuid(1), 3)).rejects.toMatchObject({ status: 503 });
      await q("drop trigger boom on public.jobs");
      expect(await wall()).toEqual(before);
      expect(await positions()).toEqual(beforePositions);
    });
    it("el nuevo orden se aplica al muro y al listado de la pantalla Portada", async () => {
      await moveWallJob(client(), ownerA, uuid(1), 0);
      const page = await portadaJobs(client(), ownerA, 1);
      expect(page.jobs.map(entry => entry.job.id)).toEqual([...(await wall()), uuid(9)]);
      expect(page.jobs[0].job.id).toBe(uuid(1));
    });
  });

  describe("paginación del muro con el orden manual", () => {
    it("30 trabajos: tres páginas de 12 siguen el orden manual sin repetidos ni huecos", async () => {
      for (let n = 1; n <= 30; n++) await makeJob(n, ownerA, `2026-01-${String((n % 28) + 1).padStart(2, "0")}`);
      await publish(...Array.from({ length: 30 }, (_, i) => i + 1));
      await moveWallJob(client(), ownerA, uuid(5), 0);
      await moveWallJob(client(), ownerA, uuid(17), 29);
      await moveWallJob(client(), ownerA, uuid(30), 12);
      const full = await wall();
      expect(full[0]).toBe(uuid(5)); expect(full[29]).toBe(uuid(17)); expect(full[12]).toBe(uuid(30));
      const pages = [...await listed(12, 0), ...await listed(12, 12), ...await listed(12, 24)];
      expect(pages).toEqual(full);
      expect(new Set(pages).size).toBe(30);
      expect((await listed(12, 24)).length).toBe(6);
      const screen = await portadaJobs(client(), ownerA, 3);
      expect(screen.jobs.map(entry => entry.job.id)).toEqual(full.slice(24));
      expect((await portadaJobs(client(), ownerA, 1)).hasNext).toBe(true);
    });
  });

  describe("contracción: retirar pinned_job_id (20261013120000_drop_pinned_job)", () => {
    it("tras recrear las políticas, la app sigue guardando la portada y la RLS se mantiene", async () => {
      await fixture.db.exec(await readFile("supabase/migrations/20261013120000_drop_pinned_job.sql", "utf8"));
      expect((await q("select column_name from information_schema.columns where table_schema='public' and table_name='portfolio_settings'")).rows.map(row => row.column_name)).not.toContain("pinned_job_id");
      await makeJob(1); await q("insert into public.job_media(id,job_id,storage_path,mime_type,position,width,height,byte_size) values ($1,$2,$3,'image/png',1,1,1,1)", [uuid(2001), uuid(1), `${ownerA}/${uuid(1)}/${uuid(2001)}.png`]);
      await q("insert into storage.objects(bucket_id,name) values ('portfolio-derivatives',$1)", [`${uuid(1)}/${uuid(2001)}.webp`]);
      await publish(1);
      await setFeaturedTransformation(client(), ownerA, { job_id: uuid(1), before_id: uuid(1001), after_id: uuid(2001) });
      expect((await as("anon", null, "select before_id, after_id from public.get_featured_transformation()")).rows).toEqual([{ before_id: uuid(1001), after_id: uuid(2001) }]);
      await expect(as("authenticated", ownerB, "insert into public.portfolio_settings(owner_id, featured_job_id) values ($1,$2)", [ownerB, uuid(1)])).rejects.toMatchObject({ code: "42501" });
      expect((await listed()).length).toBe(1);
    });
  });
});

// El resto de archivos de pruebas usa mediaA/mediaB; se referencian para evitar importaciones sin uso en el fixture común.
void mediaA; void mediaB;
