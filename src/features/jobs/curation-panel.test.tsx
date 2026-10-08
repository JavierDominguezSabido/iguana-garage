import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CurationPanel } from "./curation-panel";
import type { Media } from "./data";
import type { CurationState } from "./curation";

const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222", "33333333-3333-4333-8333-333333333333"];
const photo = (id: string, position: number, hidden = false): Media => ({ id, job_id: "44444444-4444-4444-8444-444444444444", storage_path: `x/${id}.jpg`, mime_type: "image/jpeg", position, width: 1080, height: 1350, byte_size: 1000, focal_x: 50, focal_y: 50, hidden_from_home: hidden, created_at: "2026-01-01T00:00:00Z" });
const none: CurationState = { pinned: false, otherPinnedName: null, featured: null, otherFeaturedName: null };
const render = (props: { isPublic?: boolean; media?: Media[]; state?: Partial<CurationState> } = {}) => renderToStaticMarkup(createElement(CurationPanel, {
  jobId: "44444444-4444-4444-8444-444444444444", isPublic: props.isPublic ?? true, media: props.media ?? ids.map((id, index) => photo(id, index)), state: { ...none, ...props.state },
}));
const disabledButtons = (markup: string) => (markup.match(/<button[^>]*disabled=""[^>]*>/g) ?? []).length;

it("trabajo publicado sin ajustes: invita a elegir y no permite destacar todavía", () => {
  const markup = render();
  expect(markup).toContain("Portada y muro");
  expect(markup).toContain("Elige la foto del antes y la del después.");
  expect(markup).toContain("Destacar en portada");
  expect(markup).not.toContain("Quitar de portada");
  expect(markup).toContain("Solo puede haber uno fijado.");
  expect(markup).toContain("3 de 3 visibles");
  expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Destacar en portada<\/button>/);
});

it("trabajo privado: no se puede fijar ni destacar, pero sí ocultar fotos", () => {
  const markup = render({ isPublic: false });
  expect(markup).toContain("Publica el trabajo para fijarlo o destacarlo. Puedes ocultar fotos desde ya.");
  expect(markup).toMatch(/<input type="checkbox"[^>]*disabled=""/);
  expect(markup).toMatch(/aria-label="Foto 1: visible en la web. Tocar para ocultar"(?![^>]*disabled)/);
});

it("con transformación guardada muestra su estado, bloquea sus fotos y ofrece quitarla", () => {
  const markup = render({ state: { featured: { beforeId: ids[0], afterId: ids[1] }, pinned: true } });
  expect(markup).toContain("En portada ahora mismo.");
  expect(markup).toContain("Quitar de portada");
  expect(markup).toContain("Actualizar portada");
  expect(markup).toContain("Está fijado: aparece el primero en la página de inicio.");
  expect(markup.match(/Foto \d: en la portada/g)).toHaveLength(2);
  expect(markup).toMatch(/aria-label="Antes: foto 1"/);
  expect(markup).toMatch(/aria-label="Después: foto 2"/);
  expect(markup).toMatch(/aria-label="Foto 3: visible en la web. Tocar para ocultar"/);
});

it("la selección dormida avisa de que el trabajo está privado", () => {
  const markup = render({ isPublic: false, state: { featured: { beforeId: ids[0], afterId: ids[1] } } });
  expect(markup).toContain("Inactiva: el trabajo está privado. Volverá a mostrarse al publicarlo.");
});

it("avisa de qué trabajo se sustituiría", () => {
  const markup = render({ state: { otherPinnedName: "Mercedes", otherFeaturedName: "Suzuki" } });
  expect(markup).toContain("Ahora está fijado «Mercedes»; este lo sustituirá.");
  expect(markup).toContain("Al destacarla sustituirás la transformación de «Suzuki».");
});

it("las fotos ocultas se distinguen con texto, no solo con color, y no cuentan como visibles", () => {
  const markup = render({ media: [photo(ids[0], 0), photo(ids[1], 1, true), photo(ids[2], 2)] });
  expect(markup).toContain("Foto 2: oculta en la web. Tocar para mostrar");
  expect(markup).toContain(">Oculta<");
  expect(markup).toContain("2 de 3 visibles");
  expect(markup).toContain('class="is-hidden"');
});

it("con menos de dos fotos no hay transformación posible", () => {
  const markup = render({ media: [photo(ids[0], 0)] });
  expect(markup).toContain("Necesitas al menos dos fotos para una transformación.");
  expect(disabledButtons(markup)).toBeGreaterThan(0);
  expect(render({ media: [] })).toContain("Este trabajo no tiene fotografías.");
});
