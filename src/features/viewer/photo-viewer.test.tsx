import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PhotoViewer } from "./photo-viewer";

const render = (count: number, index = 0) => renderToStaticMarkup(createElement(PhotoViewer, {
  skin: "test-viewer", label: "Fotografías de Trabajo de prueba", title: "Trabajo de prueba", closeLabel: "Cerrar fotografías", index, count,
  onIndexChange: () => {}, onClose: () => {}, photo: createElement("img", { alt: "foto actual", src: "/x.webp" }),
  renderThumb: (i: number) => createElement("span", { "data-thumb": i }),
}));

it("es un diálogo con título, contador «n / total», estado accesible y botón de cerrar", () => {
  const markup = render(3, 1);
  expect(markup).toContain("<dialog"); expect(markup).toContain('class="test-viewer"'); expect(markup).toContain('aria-label="Fotografías de Trabajo de prueba"');
  expect(markup).toContain(">Trabajo de prueba<");
  expect(markup).toContain('class="test-viewer-count" aria-hidden="true">2 / 3<');
  expect(markup).toContain('role="status"'); expect(markup).toContain("Fotografía 2 de 3");
  expect(markup).toContain('aria-label="Cerrar fotografías"');
});

it("con varias fotos hay flechas anterior/siguiente y miniaturas con la activa marcada", () => {
  const markup = render(3, 2);
  expect(markup).toContain('aria-label="Fotografía anterior"'); expect(markup).toContain('aria-label="Fotografía siguiente"');
  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(markup.match(/aria-pressed="false"/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="Ver fotografía 3" aria-pressed="true"');
  expect(markup).toContain('data-thumb="0"'); expect(markup).toContain('data-thumb="2"');
});

it("con una sola foto no hay flechas ni miniaturas ni contador de navegación que sobre", () => {
  const markup = render(1);
  expect(markup).not.toContain("Fotografía anterior"); expect(markup).not.toContain("Fotografía siguiente"); expect(markup).not.toContain("aria-pressed");
  expect(markup).toContain("foto actual");
});

it("la foto actual va en el escenario contain, entre las flechas, y el cierre es el primer elemento enfocable", () => {
  const markup = render(2);
  expect(markup.indexOf("test-viewer-close")).toBeLessThan(markup.indexOf("test-viewer-prev"));
  expect(markup.indexOf("test-viewer-prev")).toBeLessThan(markup.indexOf('class="test-viewer-photo"'));
  expect(markup.indexOf('class="test-viewer-photo"')).toBeLessThan(markup.indexOf("test-viewer-next"));
});
