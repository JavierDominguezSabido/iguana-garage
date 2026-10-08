import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/config", () => ({ getSupabaseConfig: () => ({ url: "http://localhost", key: "sb_publishable_test" }) }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc }) }));
import { featuredTransformation, homeData } from "./data";

const job = "22222222-2222-4222-8222-222222222222", before = "33333333-3333-4333-8333-333333333333", after = "44444444-4444-4444-8444-444444444444";
const photo = (id: string) => ({ id, path: `${job}/${id}.webp`, focal_x: 50, focal_y: 50 });
const wallRow = { id: job, name: "Audi", job_date: "2026-10-06", description: null, media: [photo(before), photo(after)] };
const featuredRow = { ...wallRow, before_id: before, after_id: after };
const ok = (data: unknown) => ({ data, error: null });
const answer = (featured: unknown, wall: unknown = ok([wallRow])) => rpc.mockImplementation(async (name: string) => name === "get_featured_transformation" ? featured : wall);

const fail = { data: null, error: { message: "boom" } };
beforeEach(() => rpc.mockReset());

describe("portada y muro de la home", () => {
  it("la transformación se pide sin argumentos y se valida", async () => {
    answer(ok([featuredRow]));
    const result = await featuredTransformation();
    expect(rpc).toHaveBeenCalledExactlyOnceWith("get_featured_transformation");
    expect(result).toMatchObject({ job: { id: job }, before: { id: before }, after: { id: after } });
  });
  it("página 1: muro y portada juntos", async () => {
    answer(ok([featuredRow]));
    const result = await homeData(1);
    expect(result).toMatchObject({ failed: false, hasNext: false, jobs: [{ id: job }], transformation: { before: { id: before } } });
  });
  it("si falla la portada, el muro sigue y la portada queda con el título solo", async () => {
    answer(fail);
    expect(await homeData(1)).toMatchObject({ failed: false, jobs: [{ id: job }], transformation: undefined });
    answer(ok([{ ...featuredRow, before_id: "x" }]));
    expect(await homeData(1)).toMatchObject({ failed: false, jobs: [{ id: job }], transformation: undefined });
  });
  it("sin transformación elegida o devuelta, solo título", async () => {
    answer(ok([]));
    expect((await homeData(1)).transformation).toBeUndefined();
  });
  it("si falla el muro se señala el error sin llevarse la portada", async () => {
    answer(ok([featuredRow]), fail);
    expect(await homeData(1)).toMatchObject({ failed: true, jobs: [], hasNext: false, transformation: { after: { id: after } } });
  });
  it("desde la página 2 no se pide la portada", async () => {
    answer(ok([featuredRow]));
    const result = await homeData(2);
    expect(result.transformation).toBeUndefined();
    expect(rpc.mock.calls.map(call => call[0])).toEqual(["list_public_jobs"]);
  });
});
