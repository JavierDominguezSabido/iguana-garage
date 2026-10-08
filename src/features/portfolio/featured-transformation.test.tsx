import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { COMPARE_MAX, COMPARE_MIN } from "./compare";
import { FeaturedTransformation } from "./featured-transformation";
import type { PublicJob } from "./contract";

const media = (id: string) => ({ id, path: `44444444-4444-4444-8444-444444444444/${id}.webp`, focal_x: 50, focal_y: 50 });
const job: PublicJob = { id: "44444444-4444-4444-8444-444444444444", name: "Trabajo de prueba", job_date: "2026-01-01", description: null, media: [media("11111111-1111-4111-8111-111111111111"), media("22222222-2222-4222-8222-222222222222")] };
const markup = renderToStaticMarkup(createElement(FeaturedTransformation, { transformation: { job, before: job.media[0], after: job.media[1] } }));

it("el comparador es un slider con nombre accesible, rango seguro y foco por teclado", () => {
  expect(markup).toContain('role="slider"');
  expect(markup).toContain('aria-label="Comparador Antes y Después: Trabajo de prueba"');
  expect(markup).toContain('tabindex="0"');
  expect(markup).toContain(`aria-valuemin="${COMPARE_MIN}"`); expect(markup).toContain(`aria-valuemax="${COMPARE_MAX}"`);
  expect(markup).toContain('aria-valuenow="50"'); expect(markup).toContain('aria-valuetext="Antes 50 %, Después 50 %"');
});
it("el nombre del trabajo es una etiqueta sobre el comparador y las dos fotos tienen texto alternativo", () => {
  expect(markup.indexOf('class="pub-compare-tag">Trabajo de prueba')).toBeGreaterThanOrEqual(0);
  expect(markup.indexOf("pub-compare-tag")).toBeLessThan(markup.indexOf('class="pub-compare"'));
  expect(markup).toContain('alt="Trabajo de prueba, antes"'); expect(markup).toContain('alt="Trabajo de prueba, después"');
});
it("tocar el comparador no abre nada: solo el botón visible «Ver fotos» abre el visor", () => {
  expect(markup).not.toContain("pub-photo-trigger");
  expect(markup.match(/aria-haspopup="dialog"/g)).toHaveLength(1);
  expect(markup).toMatch(/<button[^>]*class="pub-compare-open"[^>]*aria-haspopup="dialog"[^>]*>Ver fotos/);
});
