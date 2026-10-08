import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PhotoViewer } from "./photo-viewer";

const render = (count: number, index = 0) => renderToStaticMarkup(createElement(PhotoViewer, {
  skin: "test-viewer", label: "Fotografías de Trabajo de prueba", title: "Trabajo de prueba", closeLabel: "Cerrar fotografías", index, count,
  onIndexChange: () => {}, onClose: () => {},
  renderPhoto: (i: number) => createElement("img", { alt: `foto ${i}`, src: `/full-${i}.webp`, "data-full": i }),
  renderThumb: (i: number) => createElement("img", { alt: "", src: `/thumb-${i}.webp`, "data-thumb": i }),
}));

it("es un diálogo con título, contador «n / total», estado accesible y botón de cerrar", () => {
  const markup = render(3, 1);
  expect(markup).toContain("<dialog"); expect(markup).toContain('class="test-viewer"'); expect(markup).toContain('aria-label="Fotografías de Trabajo de prueba"');
  expect(markup).toContain(">Trabajo de prueba<");
  expect(markup).toContain('class="test-viewer-count" aria-hidden="true">2 / 3<');
  expect(markup).toContain('role="status"'); expect(markup).toContain("Fotografía 2 de 3");
  expect(markup).toContain('aria-label="Cerrar fotografías"');
});

it("monta solo la foto actual y sus dos vecinas, cada una con su miniatura como marcador y su foto completa", () => {
  const markup = render(8, 3);
  expect(markup.match(/class="test-viewer-slide"/g)).toHaveLength(3);
  for (const i of [2, 3, 4]) { expect(markup).toContain(`data-full="${i}"`); expect(markup).toContain(`/full-${i}.webp`); }
  for (const i of [0, 1, 5, 6, 7]) expect(markup).not.toContain(`/full-${i}.webp`);
  expect(markup.match(/class="test-viewer-ph"/g)).toHaveLength(3);
  expect(markup.match(/class="test-viewer-full"/g)).toHaveLength(3);
});

it("solo la foto actual es accesible; las vecinas quedan ocultas e inertes y la tira las coloca a ±1", () => {
  const markup = render(5, 0);
  expect(markup.match(/data-current="true"/g)).toHaveLength(1);
  expect(markup.match(/aria-hidden="true" inert/g)).toHaveLength(2);
  expect(markup).toContain("--o:-1"); expect(markup).toContain("--o:0"); expect(markup).toContain("--o:1");
  expect(markup.indexOf("test-viewer-track")).toBeGreaterThan(markup.indexOf('class="test-viewer-photo"'));
});

it("con varias fotos hay flechas anterior/siguiente y miniaturas con la activa marcada", () => {
  const markup = render(3, 2);
  expect(markup).toContain('aria-label="Fotografía anterior"'); expect(markup).toContain('aria-label="Fotografía siguiente"');
  expect(markup.match(/aria-pressed="true"/g)).toHaveLength(1);
  expect(markup.match(/aria-pressed="false"/g)).toHaveLength(2);
  expect(markup).toContain('aria-label="Ver fotografía 3" aria-pressed="true"');
});

it("con dos fotos se montan ambas y con una sola no hay flechas, miniaturas ni vecinas", () => {
  expect(render(2, 0).match(/class="test-viewer-slide"/g)).toHaveLength(2);
  const single = render(1);
  expect(single.match(/class="test-viewer-slide"/g)).toHaveLength(1);
  expect(single).not.toContain("Fotografía anterior"); expect(single).not.toContain("Fotografía siguiente"); expect(single).not.toContain("aria-pressed");
});

it("la foto de cada diapositiva carga primero un estado de carga y el cierre es el primer elemento enfocable", () => {
  const markup = render(3, 1);
  expect(markup).toContain('data-state="loading"');
  expect(markup.indexOf("test-viewer-close")).toBeLessThan(markup.indexOf("test-viewer-prev"));
  expect(markup.indexOf("test-viewer-prev")).toBeLessThan(markup.indexOf('class="test-viewer-photo"'));
  expect(markup.indexOf('class="test-viewer-photo"')).toBeLessThan(markup.indexOf("test-viewer-next"));
});
