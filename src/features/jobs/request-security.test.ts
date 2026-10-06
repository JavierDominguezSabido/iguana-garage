import { expect, it } from "vitest";
import { sameOrigin } from "./request-security";
it("usa el host recibido, aunque Next normalice la URL interna", () => {
  const request = new Request("http://localhost:3100/app/api/jobs", { headers: { host: "127.0.0.1:3100", origin: "http://127.0.0.1:3100", "x-forwarded-proto": "http" } });
  expect(sameOrigin(request)).toBe(true);
});
it.each(["https://evil.example", "null", "http://127.0.0.1:3100/private"])("deniega un origen ajeno/inválido: %s", (origin) => {
  expect(sameOrigin(new Request("http://localhost:3100/app/api/jobs", { headers: { host: "127.0.0.1:3100", origin } }))).toBe(false);
});
