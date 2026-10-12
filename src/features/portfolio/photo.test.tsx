import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublicPhoto } from "./photo";

it("renderiza Next/Image también con su comprobación del loader en desarrollo", () => {
  expect(() => renderToStaticMarkup(createElement(PublicPhoto, {
    jobId: "11111111-1111-4111-8111-111111111111",
    mediaId: "22222222-2222-4222-8222-222222222222",
    alt: "Fotografía de prueba de render",
    sizes: "100vw",
  }))).not.toThrow();
});
it("las imágenes críticas conservan prioridad alta sin preload que duplique descargas no-store",()=>{
  const markup=renderToStaticMarkup(createElement(PublicPhoto,{jobId:"11111111-1111-4111-8111-111111111111",mediaId:"22222222-2222-4222-8222-222222222222",alt:"Foto crítica",sizes:"100vw",preload:true}));
  expect((markup.match(/<link /g)??[])).toHaveLength(0);expect(markup).toContain('fetchPriority="high"');expect(markup).toContain('loading="lazy"');
});
const ids = { jobId: "11111111-1111-4111-8111-111111111111", mediaId: "22222222-2222-4222-8222-222222222222", alt: "Foto", sizes: "100vw" };
it("el recorte cover aplica el punto focal como object-position", () => {
  const markup = renderToStaticMarkup(createElement(PublicPhoto, { ...ids, preview: true, focal: { focal_x: 20, focal_y: 80 } }));
  expect(markup).toContain("object-position:20% 80%");
});
it("el visor contain y las fotos sin punto focal no reciben object-position", () => {
  expect(renderToStaticMarkup(createElement(PublicPhoto, { ...ids, focal: { focal_x: 20, focal_y: 80 } }))).not.toContain("object-position:20%");
  expect(renderToStaticMarkup(createElement(PublicPhoto, { ...ids, preview: true }))).not.toContain("object-position");
});
it("las fotos que se animan piden como mucho la variante indicada (390/640), aunque la pantalla tenga mucha densidad", () => {
  const markup = renderToStaticMarkup(createElement(PublicPhoto, { ...ids, preview: true, maxWidth: 640 }));
  const widths = [...markup.matchAll(/[?&]w=(\d+)/g)].map((match) => Number(match[1]));
  expect(widths.length).toBeGreaterThan(0);
  expect(Math.max(...widths)).toBe(640);
});
it("en pantallas anchas puede servir variantes mayores con una fuente propia de <picture>", () => {
  const markup = renderToStaticMarkup(createElement(PublicPhoto, { ...ids, preview: true, maxWidth: 640, wide: { media: "(min-width: 1100px)", sizes: "100vw" } }));
  expect(markup).toMatch(/<picture><source media="\(min-width: 1100px\)" srcSet="[^"]*w=1600[^"]*" sizes="100vw"\/><img /);
  expect(markup).toContain("</picture>");
});
