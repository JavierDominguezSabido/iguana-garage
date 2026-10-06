import { describe, expect, it } from "vitest";
import { whatsappContact } from "./contact";

describe("contacto público confirmado", () => {
  it.each([undefined, "", "  ", "620123456", "javascript:alert(1)", "https://evil.example", "+34 600 000 000", "00012345678"])("no inventa ni construye enlaces con configuración inválida", (number) => {
    expect(whatsappContact(number)).toBeNull();
  });
  it("construye un único destino internacional y codifica el mensaje", () => {
    // Número sintético para comprobar la construcción; no es contacto del taller.
    const contact = whatsappContact("+12025550123");
    expect(contact?.href).toBe("https://wa.me/12025550123?text=" + encodeURIComponent("Hola, quiero consultar un trabajo de chapa y pintura."));
  });
});
