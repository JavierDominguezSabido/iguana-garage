import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Gallery } from "./gallery";
import type { Media } from "./data";

const media = (id: string, position: number, focal_x: number, focal_y: number): Media => ({ id, job_id: "44444444-4444-4444-8444-444444444444", storage_path: `x/${id}.jpg`, mime_type: "image/jpeg", position, width: 1080, height: 1350, byte_size: 1000, focal_x, focal_y, hidden_from_home: false, created_at: "2026-01-01T00:00:00Z" });
const a = "11111111-1111-4111-8111-111111111111", b = "22222222-2222-4222-8222-222222222222";
const markup = renderToStaticMarkup(createElement(Gallery, { name: "Trabajo de prueba", media: [media(a, 0, 20, 80), media(b, 1, 70, 10)] }));
const thumbs = markup.slice(markup.indexOf('class="gallery-thumbs"'));

it("las miniaturas recortan cada foto con su propio encuadre", () => {
  expect(thumbs).toContain("object-position:20% 80%");
  expect(thumbs).toContain("object-position:70% 10%");
});

it("la foto principal muestra la imagen completa y no recibe encuadre", () => {
  const main = markup.slice(markup.indexOf('class="gallery-main"'), markup.indexOf('class="gallery-thumbs"'));
  expect(main).toContain("<img"); expect(main).not.toContain("object-position");
});

it("el visor a pantalla completa solo se monta al abrirlo y la foto principal avisa de que abre un diálogo", () => {
  expect(markup).not.toContain("<dialog");
  expect(markup).toContain('aria-haspopup="dialog"'); expect(markup).toContain("Ampliar fotografía");
});

it("sin encuadre distinto del centro la miniatura queda centrada", () => {
  const centered = renderToStaticMarkup(createElement(Gallery, { name: "T", media: [media(a, 0, 50, 50), media(b, 1, 50, 50)] }));
  expect(centered.slice(centered.indexOf('class="gallery-thumbs"'))).toContain("object-position:50% 50%");
});

it("con una sola foto no hay tira de miniaturas, como en el visor", () => {
  const single = renderToStaticMarkup(createElement(Gallery, { name: "T", media: [media(a, 0, 50, 50)] }));
  expect(single).not.toContain("gallery-thumbs"); expect(single).not.toContain("Ver fotografía 1");
  expect(single).toContain("Ampliar fotografía");
});
