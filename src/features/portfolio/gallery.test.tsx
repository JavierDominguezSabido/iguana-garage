import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublicGallery } from "./gallery";
import type { PublicJob } from "./contract";

const jobId = "44444444-4444-4444-8444-444444444444";
const photo = (n: number) => { const id = `${String(n).repeat(8)}-1111-4111-8111-111111111111`; return { id, path: `${jobId}/${id}.webp`, focal_x: 20, focal_y: 70 }; };
const work = (photos: number, description: string | null = null): PublicJob => ({ id: jobId, name: "Trabajo de prueba", job_date: "2026-01-15", description, media: Array.from({ length: photos }, (_, index) => photo(index + 1)) });
const render = (job: PublicJob) => renderToStaticMarkup(createElement(PublicGallery, { job }));

it("cada trabajo es una banda anclable con nombre, fecha, número de fotos y «Ver fotos»", () => {
  const markup = render(work(3));
  expect(markup).toContain(`id="trabajo-${jobId}"`);
  expect(markup).toContain(`<h3 id="job-${jobId}" class="pub-band-name">Trabajo de prueba</h3>`);
  expect(markup).toContain('dateTime="2026-01-15"'); expect(markup).toContain("3 fotografías");
  expect(markup).toMatch(/Ver fotos<span class="pub-sr-only"> de Trabajo de prueba<\/span><\/button>/);
});
it("una foto ampliable por imagen, repartidas en dos columnas escalonadas con el punto focal", () => {
  const markup = render(work(3));
  for (const n of [1, 2, 3]) expect(markup).toContain(`aria-label="Ampliar Trabajo de prueba, fotografía ${n}"`);
  expect(markup.match(/class="pub-tile"/g)).toHaveLength(3);
  expect(markup.match(/class="pub-col"/g)).toHaveLength(2);
  expect(markup).toContain("object-position:20% 70%");
  expect(markup).toContain("--r:4 / 5"); expect(markup).toContain("--r:1 / 1");
});
it("una sola foto usa una columna y singular; la descripción solo aparece si existe", () => {
  const single = render(work(1, "Reparación de paragolpes"));
  expect(single).toContain("1 fotografía<"); expect(single).toContain("Reparación de paragolpes");
  expect(single.match(/class="pub-col"/g)).toHaveLength(1);
  expect(render(work(2))).not.toContain("pub-band-desc");
});
it("un trabajo sin ninguna foto visible no pinta banda ni estado vacío", () => {
  expect(render(work(0))).toBe("");
});
it("cada foto pide el ancho de su columna", () => {
  expect(render(work(2))).toContain('sizes="(min-width: 1100px) 26vw, 46vw"');
  expect(render(work(1))).toContain('sizes="(min-width: 1100px) 40vw, 92vw"');
});
