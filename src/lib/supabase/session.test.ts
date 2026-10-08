import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createBrowserSupabaseClient } from "./browser";
import { createServerSupabaseClient, requireAuthenticatedSupabase } from "./server";
import { updateSession } from "./session";

vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ server: vi.fn(), browser: vi.fn(), cookies: vi.fn(), getUser: vi.fn(), setCookie: vi.fn() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: mock.server, createBrowserClient: mock.browser }));
vi.mock("next/headers", () => ({ cookies: mock.cookies }));

describe("infraestructura SSR (unitarias, no prueba de autorización RLS)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test_placeholder");
    vi.stubEnv("NODE_ENV", "test");
    vi.clearAllMocks();
    mock.getUser.mockResolvedValue({ data: { user: { id: "11111111-1111-4111-8111-111111111111", is_anonymous: false } }, error: null });
    mock.server.mockReturnValue({ auth: { getUser: mock.getUser } });
    mock.browser.mockReturnValue({ browser: true });
    mock.cookies.mockResolvedValue({ getAll: () => [{ name: "test-cookie", value: "placeholder" }], set: mock.setCookie });
  });
  it("separa el cliente de navegador", () => {
    expect(createBrowserSupabaseClient()).toEqual({ browser: true });
    expect(mock.browser).toHaveBeenCalledWith("https://example.supabase.co", "sb_publishable_unit_test_placeholder", { cookieOptions: { secure: false } });
  });
  it("usa cookies Secure en producción en navegador, servidor y Proxy", async () => {
    vi.stubEnv("NODE_ENV", "production");
    createBrowserSupabaseClient();
    await createServerSupabaseClient();
    await updateSession(new NextRequest("https://garage.example/app"));
    expect(mock.browser.mock.calls[0][2]?.cookieOptions?.secure).toBe(true);
    expect(mock.server.mock.calls.every((call) => call[2]?.cookieOptions?.secure === true)).toBe(true);
  });
  it("lee cookies en RSC sin intentar escribirlas", async () => {
    await createServerSupabaseClient();
    const options = mock.server.mock.calls[0][2];
    expect(options.cookies.getAll()).toEqual([{ name: "test-cookie", value: "placeholder" }]);
    expect(options.cookies.setAll).toBeUndefined();
  });
  it("permite escrituras explícitas en contexto que las soporte", async () => {
    await createServerSupabaseClient({ writable: true });
    mock.server.mock.calls[0][2].cookies.setAll([{ name: "test-cookie", value: "updated", options: { sameSite: "lax" } }]);
    expect(mock.setCookie).toHaveBeenCalledWith("test-cookie", "updated", { sameSite: "lax" });
  });
  it("valida al usuario en Auth para cada acceso privado", async () => {
    const result = await requireAuthenticatedSupabase();
    expect(result.user.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(mock.getUser).toHaveBeenCalledOnce();
  });
  it.each([{ data: { user: null }, error: null }, { data: { user: null }, error: { status: 401 } }, { data: { user: { id: "11111111-1111-4111-8111-111111111111", is_anonymous: true } }, error: null }])("deniega sesión ausente, caducada o anónima", async (result) => {
    mock.getUser.mockResolvedValue(result);
    await expect(requireAuthenticatedSupabase()).rejects.toThrow("Sesión no válida");
  });
  it("conserva cookies y evita caché incluso al redirigir", async () => {
    mock.server.mockImplementation((_url, _key, options) => ({ auth: { getUser: async () => {
      options.cookies.setAll([{ name: "refresh", value: "placeholder", options: { path: "/" } }], { "cache-control": "no-store" });
      expect(options.cookies.getAll()).toContainEqual({ name: "refresh", value: "placeholder" });
      return { data: { user: null }, error: null };
    } } }));
    const response = await updateSession(new NextRequest("https://garage.example/app/jobs/123?next=https://other.example"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://garage.example/app/login");
    expect(response.cookies.get("refresh")?.value).toBe("placeholder");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("permite la petición autenticada sin caché", async () => {
    const response = await updateSession(new NextRequest("https://garage.example/app"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("private");
  });
  it("solo el login exacto permite anónimo dentro de /app, sin omitir validación Auth",async()=>{
    mock.getUser.mockResolvedValue({data:{user:null},error:null});
    const login=await updateSession(new NextRequest("https://garage.example/app/login"));
    expect(login.status).toBe(200);expect(login.headers.get("cache-control")).toContain("private, no-store");
    expect(mock.getUser).toHaveBeenCalledOnce();
    for(const path of ["/app","/app/new","/app/login/extra","/app/loginish","/app/api/jobs"]){
      const response=await updateSession(new NextRequest(`https://garage.example${path}`));
      expect(response.status).toBe(307);expect(response.headers.get("location")).toBe("https://garage.example/app/login");
    }
  });
  it("cierra el acceso ante errores de red y configuración", async () => {
    mock.getUser.mockRejectedValue(new Error("Internal details"));
    const response = await updateSession(new NextRequest("https://garage.example/app"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("Internal details");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    expect((await updateSession(new NextRequest("https://garage.example/app"))).status).toBe(503);
  });
});
