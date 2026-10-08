import { afterAll, beforeAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { finishJob, prepareJob } from "@/features/jobs/data";
import { storageFixture } from "./storage-fixture";
import { jobA, ownerA } from "./database";

// Ruta real de guardado (validateJob → prepareJob/finishJob → PostgreSQL con sus CHECK).
let fixture: Awaited<ReturnType<typeof storageFixture>>;
beforeAll(async () => { fixture = await storageFixture(); });
afterAll(async () => { await fixture?.close(); });
const stored = async (id: string) => (await fixture.db.query<{ work_hours: string | null; description: string | null }>("select work_hours, description from public.jobs where id=$1", [id])).rows[0];

it("descripción vacía o solo espacios y horas vacías se persisten como NULL, nunca como cadena vacía", async () => {
  const client = fixture.client(ownerA);
  const base = { name: "Fixture", job_date: "2026-10-08" };
  await prepareJob(client, ownerA, jobA, { ...base, work_hours: 12.5, description: "Texto previo" }, false);
  expect(await stored(jobA)).toEqual({ work_hours: "12.50", description: "Texto previo" });
  for (const description of ["", "   ", " \n\t "]) {
    await prepareJob(client, ownerA, jobA, { ...base, work_hours: null, description }, false);
    expect(await stored(jobA)).toEqual({ work_hours: null, description: null });
    await prepareJob(client, ownerA, jobA, { ...base, work_hours: 3, description: "Otra" }, false);
    await finishJob(client, ownerA, jobA, { ...base, work_hours: null, description });
    expect(await stored(jobA)).toEqual({ work_hours: null, description: null });
  }
  const created = "99999999-9999-4999-8999-999999999999";
  await prepareJob(client, ownerA, created, { ...base, description: "  " }, true);
  expect(await stored(created)).toEqual({ work_hours: null, description: null });
});
