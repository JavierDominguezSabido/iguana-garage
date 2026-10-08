import { afterEach, describe, expect, it, vi } from "vitest";
import { send } from "./api-client";

const respond = (status: number, body: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

describe("envío a los Route Handlers privados", () => {
  it("serializa JSON con su cabecera y acepta respuestas correctas", async () => {
    respond(200, { ok: true });
    await send("/app/api/portfolio", "PATCH", { pinned_job_id: null });
    expect(fetch).toHaveBeenCalledWith("/app/api/portfolio", { method: "PATCH", body: '{"pinned_job_id":null}', headers: { "content-type": "application/json" } });
  });
  it("envía FormData sin cabecera propia y DELETE sin cuerpo", async () => {
    respond(200, { ok: true });
    const data = new FormData();
    await send("/x", "POST", data);
    expect(vi.mocked(fetch).mock.calls[0][1]).toEqual({ method: "POST", body: data });
    await send("/x", "DELETE");
    expect(vi.mocked(fetch).mock.calls[1][1]).toEqual({ method: "DELETE" });
  });
  it("traduce errores del servidor, de red y respuestas sin JSON", async () => {
    respond(409, { error: "Esta foto está en la portada." });
    await expect(send("/x", "PATCH", {})).rejects.toThrow("Esta foto está en la portada.");
    respond(500, {});
    await expect(send("/x", "PATCH", {})).rejects.toThrow("No se pudo completar la operación");
    respond(200, "<html>");
    await expect(send("/x", "PATCH", {})).rejects.toThrow(/sesión ha terminado/);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    await expect(send("/x", "PATCH", {})).rejects.toThrow(/No hay conexión/);
  });
});
