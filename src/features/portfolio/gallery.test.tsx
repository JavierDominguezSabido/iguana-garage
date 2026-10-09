import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublicGallery } from "./gallery";
import type { PublicJob } from "./contract";

const jobId = "44444444-4444-4444-8444-444444444444";
const photo = (n: number) => { const id = `${String(n).repeat(8)}-1111-4111-8111-111111111111`; return { id, path: `${jobId}/${id}.webp`, focal_x: 50, focal_y: 50 }; };
const work = (photos: number, description: string | null = null): PublicJob => ({ id: jobId, name: "Trabajo de prueba", job_date: "2026-01-15", description, media: Array.from({ length: photos }, (_, index) => photo(index + 1)) });
const render = (job: PublicJob) => renderToStaticMarkup(createElement(PublicGallery, { job }));

it("cada trabajo es una banda con nombre, fecha, número de fotos y una foto ampliable por cada imagen", () => {
  const markup = render(work(3));
  expect(markup).toContain(`<h3 id="job-${jobId}">Trabajo de prueba</h3>`);
  expect(markup).toContain('dateTime="2026-01-15"'); expect(markup).toContain("3 fotografías");
  for (const n of [1, 2, 3]) expect(markup).toContain(`aria-label="Ampliar Trabajo de prueba, fotografía ${n}"`);
  expect(markup.match(/class="pub-tile[" ]/g)).toHaveLength(3);
  expect(markup.match(/pub-tile-wide/g)).toHaveLength(1);
});
it("la descripción solo se muestra si existe y una sola foto usa singular", () => {
  expect(render(work(1, "Reparación de paragolpes"))).toContain("Reparación de paragolpes");
  expect(render(work(1, "Reparación de paragolpes"))).toContain("1 fotografía<");
  expect(render(work(2))).not.toContain("pub-band-desc");
});
it("un trabajo sin ninguna foto visible no pinta banda ni estado vacío", () => {
  expect(render(work(0))).toBe("");
});
it("el ancho pedido a cada foto sigue su columna: 12 columnas en escritorio y 50 % o 100 % en móvil", () => {
  expect(render(work(4))).toContain("(min-width: 900px) 25.00vw, 50vw");
  expect(render(work(3))).toContain("(min-width: 900px) 33.33vw, 100vw");
});
