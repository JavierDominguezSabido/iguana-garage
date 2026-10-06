import { describe, expect, it } from "vitest";
import { getSupabaseConfig } from "./config";

describe("configuración pública de Supabase", () => {
  const key = "sb_publishable_unit_test_placeholder";

  it("acepta HTTPS y devuelve solo URL y clave publicable", () => {
    expect(getSupabaseConfig({ url: "https://example.supabase.co/", key })).toEqual({
      url: "https://example.supabase.co", key,
    });
  });

  it.each(["http://localhost:54321", "http://127.0.0.1:54321"])("permite desarrollo local: %s", (url) => {
    expect(getSupabaseConfig({ url, key }).url).toBe(url);
  });

  it.each([undefined, "", "sb_secret_placeholder", "a.legacy.jwt"])("rechaza una clave ausente o no publicable", (value) => {
    expect(() => getSupabaseConfig({ url: "https://example.supabase.co", key: value })).toThrow("Configuración de Supabase inválida");
  });

  it.each([undefined, "", "not-a-url", "http://example.com", "https://user:password@example.com", "https://example.com/private", "https://example.com?token=placeholder", "https://example.com#fragment"])("rechaza URLs inseguras sin revelar sus valores", (url) => {
    expect(() => getSupabaseConfig({ url, key })).toThrow(/^Configuración de Supabase inválida$/);
  });
});
