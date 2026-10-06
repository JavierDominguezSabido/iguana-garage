import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy } from "./proxy";

vi.mock("server-only", () => ({}));
const session = vi.hoisted(() => vi.fn());
vi.mock("./lib/supabase/session", () => ({ updateSession: session }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_unit_test_placeholder");
  session.mockReset().mockImplementation((request: NextRequest) => NextResponse.next({ request }));
});

it("protege el documento público con nonce nuevo y sin consultar una sesión privada", async () => {
  const response = await proxy(new NextRequest("https://garage.example/", { headers: { "x-nonce": "untrusted" } }));
  const policy = response.headers.get("content-security-policy") ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  expect(nonce).not.toBe("untrusted");
  expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(policy).toContain("connect-src 'self' https://example.supabase.co");
  expect(policy).not.toContain("'unsafe-eval'");
  expect(policy.match(/script-src[^;]+/)?.[0]).not.toContain("'unsafe-inline'");
  expect(session).not.toHaveBeenCalled();
  const second = await proxy(new NextRequest("https://garage.example/"));
  expect(second.headers.get("content-security-policy")).not.toBe(policy);
});

it("conserva redirección, cookies de sesión y no-store al añadir CSP", async () => {
  session.mockImplementation((request: NextRequest) => {
    expect(request.headers.get("x-nonce")).toBeTruthy();
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set("refresh", "placeholder", { secure: true });
    response.headers.set("cache-control", "private, no-store");
    return response;
  });
  const response = await proxy(new NextRequest("https://garage.example/app"));
  expect(response.status).toBe(307);
  expect(response.headers.get("location")).toBe("https://garage.example/login");
  expect(response.cookies.get("refresh")?.value).toBe("placeholder");
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("content-security-policy")).toContain("upgrade-insecure-requests");
});

it("permite HMR solo en desarrollo y conserva HTTP local para el smoke de producción", async () => {
  let response = await proxy(new NextRequest("http://127.0.0.1:3100/"));
  expect(response.headers.get("content-security-policy")).not.toContain("upgrade-insecure-requests");
  vi.stubEnv("NODE_ENV", "development");
  response = await proxy(new NextRequest("http://localhost:3000/"));
  expect(response.headers.get("content-security-policy")).toContain("'unsafe-eval'");
  expect(response.headers.get("content-security-policy")).toContain("ws:");
});

it("la falta de configuración conserva el cierre de Auth y una CSP sin destinos externos", async () => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
  session.mockResolvedValue(new NextResponse("Servicio de autenticación no disponible", { status: 503 }));
  const response = await proxy(new NextRequest("https://garage.example/app"));
  expect(response.status).toBe(503);
  expect(response.headers.get("content-security-policy")).toContain("connect-src 'self';");
  expect((await proxy(new NextRequest("https://garage.example/"))).status).toBe(200);
});
