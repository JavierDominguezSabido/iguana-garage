import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ changePassword: vi.fn(), login: vi.fn(), logout: vi.fn() }));
const { PasswordChangeForm } = await import("./forms");
const markup = renderToStaticMarkup(createElement(PasswordChangeForm, { email: "taller@example.com" }));

it("cada campo tiene etiqueta visible, autocompletado correcto y se envía como contraseña oculta", () => {
  for (const [id, label, autocomplete] of [["current-password", "Contraseña actual", "current-password"], ["new-password", "Nueva contraseña", "new-password"], ["confirm-password", "Repite la nueva contraseña", "new-password"]]) {
    expect(markup).toContain(`<label for="${id}">${label}</label>`);
    expect(markup).toMatch(new RegExp(`<input id="${id}" type="password" autoComplete="${autocomplete}" required=""[^>]*name="${id}"/>`));
  }
});

it("los botones de mostrar u ocultar se distinguen por su nombre y anuncian su estado", () => {
  for (const name of ["Mostrar contraseña actual", "Mostrar nueva contraseña", "Mostrar contraseña repetida"]) expect(markup).toContain(`aria-label="${name}" aria-pressed="false"`);
  expect(markup.match(/type="button"/g)).toHaveLength(3);
});

it("la ayuda de longitud está asociada a la nueva contraseña", () => {
  expect(markup).toMatch(/id="new-password"[^>]*aria-describedby="new-password-help"/);
  expect(markup).toContain('id="new-password-help">Al menos 12 caracteres');
});

it("incluye el usuario para los gestores de contraseñas sin enviarlo y una región de estado para el éxito", () => {
  expect(markup).toMatch(/<input type="email" autoComplete="username" readOnly="" hidden="" value="taller@example.com"\/>/);
  expect(markup).toContain('role="status"');
  expect(markup).not.toContain('role="alert"');
});
