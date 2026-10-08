import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { JOB_LIST_SELECT, JobCard } from "./job-card";

const photo = (id: string, position: number, focal_x = 50, focal_y = 50) => ({ id, position, focal_x, focal_y });
const base = { id: "44444444-4444-4444-8444-444444444444", name: "Trabajo de prueba", job_date: "2026-01-15", is_public: true };
const render = (job_media: ReturnType<typeof photo>[]) => renderToStaticMarkup(createElement(JobCard, { job: { ...base, job_media } }));
const first = "11111111-1111-4111-8111-111111111111", second = "22222222-2222-4222-8222-222222222222";

it("el listado pide el encuadre de cada foto junto a su posición", () => {
  expect(JOB_LIST_SELECT).toContain("job_media(id,position,focal_x,focal_y)");
});

it("la tarjeta recorta la primera foto con su encuadre guardado", () => {
  const markup = render([photo(second, 1, 90, 90), photo(first, 0, 20, 80)]);
  expect(markup).toContain(`/app/api/photos/${first}`);
  expect(markup).not.toContain(`/app/api/photos/${second}`);
  expect(markup).toContain("object-position:20% 80%");
  expect(markup).toContain('class="card-image"');
});

it("sin encuadre guardado la tarjeta se centra y sin fotos muestra el marcador", () => {
  expect(render([photo(first, 0)])).toContain("object-position:50% 50%");
  const empty = render([]);
  expect(empty).toContain("Sin fotografías"); expect(empty).not.toContain("object-position");
});

it("la tarjeta enlaza al detalle y conserva nombre, fecha y estado", () => {
  const markup = render([photo(first, 0)]);
  expect(markup).toContain(`href="/app/jobs/${base.id}"`); expect(markup).toContain("Trabajo de prueba"); expect(markup).toContain("Publicado");
});

it("muestra las marcas de fijado y portada solo cuando se indican", () => {
  const withMarks = renderToStaticMarkup(createElement(JobCard, { job: { ...base, job_media: [photo(first, 0)] }, marks: { pinned: true, featured: true } }));
  expect(withMarks).toContain("Fijado"); expect(withMarks).toContain("Portada");
  const plain = render([photo(first, 0)]);
  expect(plain).not.toContain("Fijado"); expect(plain).not.toContain("Portada");
});
