import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { buildOriginalPath } from "@/features/jobs/validation";
import { parsePublicJobs } from "@/features/portfolio/contract";
import type { Database } from "@/lib/supabase/database.types";

const { url, key } = getSupabaseConfig();
const client = () => createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const a = client(); const b = client(); const anon = client();
const jobId = randomUUID(); const mediaId = randomUUID();
let ownerId = ""; let originalPath = ""; let created = false; let mediaCreated = false;
let originalUploaded = false; let derivativeUploaded = false;
const signedIn = new Set<"A" | "B">();
const unexpectedOriginals: string[] = [];
const deniedJobId = randomUUID(); let deniedJobCreated = false;
const derivativePath = `${jobId}/${mediaId}.webp`;
// Fixtures sintéticos de 1px; no utilizan ni publican assets/references.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=", "base64");
const webp = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");

describe("Auth, RLS y Storage por HTTP real (proyecto desechable autorizado)", () => {
  beforeAll(async () => {
    if (process.env.SUPABASE_TEST_DISPOSABLE !== "true" ||
        new URL(url).hostname !== `${process.env.SUPABASE_TEST_PROJECT_REF}.supabase.co`) {
      throw new Error("Falta confirmar el proyecto de pruebas dedicado: SUPABASE_TEST_PROJECT_REF y SUPABASE_TEST_DISPOSABLE=true");
    }
    for (const label of ["A", "B"]) {
      const email = process.env[`SUPABASE_TEST_USER_${label}_EMAIL`];
      const password = process.env[`SUPABASE_TEST_USER_${label}_PASSWORD`];
      if (!email || !password) throw new Error("Faltan dos cuentas temporales confirmadas en .env.integration.local; ver .env.integration.example");
      const result = await (label === "A" ? a : b).auth.signInWithPassword({ email, password });
      if (result.error || !result.data.user) throw new Error("No se pudo autenticar una cuenta temporal de pruebas");
      signedIn.add(label as "A" | "B");
    }
    const userA = await a.auth.getUser(); const userB = await b.auth.getUser();
    expect(userA.error).toBeNull(); expect(userB.error).toBeNull();
    expect(userA.data.user?.id).not.toBe(userB.data.user?.id);
    ownerId = userA.data.user!.id;
    originalPath = buildOriginalPath(ownerId, jobId, mediaId, "image/png");
    const job = await a.from("jobs").insert({ id: jobId, owner_id: ownerId, name: "Gate 3A HTTP temporal", job_date: "2026-10-06", paint_code: "PRIVATE-TEST" }).select().single();
    expect(job.error).toBeNull(); created = true;
    expect(job.data?.is_public).toBe(false);
    const uploaded = await a.storage.from("job-originals").upload(originalPath, png, { contentType: "image/png", upsert: false, cacheControl: "0" });
    expect(uploaded.error).toBeNull();
    originalUploaded = true;
    const media = await a.from("job_media").insert({ id: mediaId, job_id: jobId, storage_path: originalPath, mime_type: "image/png", position: 0, width: 1, height: 1, byte_size: png.length });
    expect(media.error).toBeNull(); mediaCreated = true;
    expect((await a.storage.from("portfolio-derivatives").upload(derivativePath, webp, { contentType: "image/webp", upsert: false, cacheControl: "0" })).error).toBeNull();
    derivativeUploaded = true;
  });
  afterAll(async () => {
    // Orden importante: objetos -> medios -> trabajo. Nunca borrar datos de otros IDs/cuentas.
    const failures: string[] = [];
    if (created && originalPath) {
      const objects = [...(derivativeUploaded ? [["portfolio-derivatives", derivativePath]] : []), ...(originalUploaded ? [["job-originals", originalPath]] : []), ...unexpectedOriginals.map((path) => ["job-originals", path])];
      for (const [bucket, path] of objects) {
        const removed = await a.storage.from(bucket).remove([path]);
        if (removed.error || !removed.data?.some((object) => object.name === path)) failures.push(`limpieza de ${bucket}`);
      }
      if (!failures.length && mediaCreated) {
        const removed = await a.from("job_media").delete().eq("id", mediaId).select("id");
        if (removed.error || removed.data?.length !== 1) failures.push("limpieza de metadatos");
      }
      if (!failures.length) {
        const removed = await a.from("jobs").delete().eq("id", jobId).select("id");
        if (removed.error || removed.data?.length !== 1) failures.push("limpieza del trabajo");
      }
      if (deniedJobCreated && (await a.from("jobs").delete().eq("id", deniedJobId)).error) failures.push("limpieza de prueba de suplantación");
    }
    for (const label of signedIn) {
      if ((await (label === "A" ? a : b).auth.signOut()).error) failures.push("cierre de sesión de prueba");
    }
    if (failures.length) throw new Error(`Limpieza incompleta: ${failures.join(", ")}. Conservar metadatos y reintentar con la cuenta A.`);
  });
  it("A lee/edita su trabajo y B no puede leer/modificar/eliminarlo", async () => {
    expect((await a.from("jobs").select("id").eq("id", jobId)).data).toHaveLength(1);
    expect((await a.from("jobs").update({ name: "Gate 3A editado" }).eq("id", jobId).select("id")).data).toHaveLength(1);
    expect((await b.from("jobs").select("id").eq("id", jobId)).data).toEqual([]);
    expect((await b.from("jobs").update({ name: "Ataque" }).eq("id", jobId).select("id")).data).toEqual([]);
    expect((await b.from("jobs").delete().eq("id", jobId).select("id")).data).toEqual([]);
    const denied = await b.from("jobs").insert({ id: deniedJobId, owner_id: ownerId, name: "Suplantación", job_date: "2026-10-06" });
    deniedJobCreated = !denied.error;
    expect(denied.error?.code).toBe("42501");
  });
  it("solo A accede a sus medios y originales existentes", async () => {
    expect((await a.from("job_media").select("id").eq("id", mediaId)).data).toHaveLength(1);
    expect((await b.from("job_media").select("id").eq("id", mediaId)).data).toEqual([]);
    expect((await a.storage.from("job-originals").download(originalPath)).data?.size).toBe(png.length);
    expect((await anon.storage.from("job-originals").download(originalPath)).error).not.toBeNull();
    expect((await b.storage.from("job-originals").download(originalPath)).error).not.toBeNull();
    await b.storage.from("job-originals").remove([originalPath]);
    expect((await a.storage.from("job-originals").download(originalPath)).data?.size).toBe(png.length);
    const deniedPath = `${ownerId}/${jobId}/${randomUUID()}.png`;
    const denied = await b.storage.from("job-originals").upload(deniedPath, png, { contentType: "image/png" });
    if (!denied.error) unexpectedOriginals.push(deniedPath);
    expect(denied.error).not.toBeNull();
  });
  it("deniega vídeo, tamaño excesivo y reemplazo implícito", async () => {
    for (const [contentType, bytes] of [["video/mp4", png], ["image/png", new Uint8Array(10485761)]] as const) {
      const path = `${ownerId}/${jobId}/${randomUUID()}.png`;
      const denied = await a.storage.from("job-originals").upload(path, bytes, { contentType });
      if (!denied.error) unexpectedOriginals.push(path);
      expect(denied.error).not.toBeNull();
    }
    expect((await a.storage.from("job-originals").upload(originalPath, png, { contentType: "image/png", upsert: true })).error).not.toBeNull();
  });
  it("controla publicación, revocación y contrato sin abrir originales", async () => {
    expect(parsePublicJobs((await anon.rpc("list_public_jobs")).data).some((j) => j.id === jobId)).toBe(false);
    expect((await anon.storage.from("portfolio-derivatives").download(derivativePath)).error).not.toBeNull();
    expect((await a.from("jobs").update({ is_public: true }).eq("id", jobId)).error).toBeNull();
    const result = await anon.rpc("list_public_jobs"); expect(result.error).toBeNull();
    const published = result.data?.find((j) => j.id === jobId);
    expect(published).toBeDefined();
    expect(Object.keys(published!).sort()).toEqual(["id", "job_date", "media", "name"]);
    expect(parsePublicJobs([published])[0].media).toEqual([{ id: mediaId, path: derivativePath }]);
    expect((await anon.storage.from("portfolio-derivatives").download(derivativePath)).data?.size).toBe(webp.length);
    expect((await anon.storage.from("portfolio-derivatives").list(jobId)).data).toEqual([]);
    expect((await anon.storage.from("portfolio-derivatives").createSignedUrl(derivativePath, 60)).error).not.toBeNull();
    expect((await anon.storage.from("job-originals").download(originalPath)).error).not.toBeNull();
    expect((await a.from("jobs").update({ is_public: false }).eq("id", jobId)).error).toBeNull();
    expect((await anon.storage.from("portfolio-derivatives").download(derivativePath)).error).not.toBeNull();
  });
  // JWT expirado: OMITIDO por decisión explícita de alcance del usuario, no PASS.
  // Supabase valida firma/caducidad; Gate 3A no implementa ni modifica ese comportamiento.
  // Tampoco se revalida aquí su criptografía mediante tokens alterados.
});
