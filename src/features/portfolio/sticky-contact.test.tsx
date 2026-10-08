import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { StickyContact } from "./sticky-contact";

const markup = renderToStaticMarkup(createElement(StickyContact, { href: "https://wa.me/34600000000?text=Hola" }));

it("el botón fijo es un enlace externo seguro y arranca oculto hasta que el título salga de pantalla", () => {
  expect(markup).toContain('class="pub-sticky"');
  expect(markup).toContain('data-visible="false"');
  expect(markup).toContain('href="https://wa.me/34600000000?text=Hola"');
  expect(markup).toContain('target="_blank"'); expect(markup).toContain('rel="noopener noreferrer"');
});
it("avisa de que abre WhatsApp en otra pestaña y su flecha es decorativa", () => {
  expect(markup).toContain("(abre WhatsApp en otra pestaña)");
  expect(markup).toContain('<span aria-hidden="true">↗</span>');
});
