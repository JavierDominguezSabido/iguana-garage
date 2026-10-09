import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PortadaScreen } from "./portada";
import type { PortadaFeatured, PortadaJobView, PortadaPhoto } from "./portada";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const photo = (n: number, hidden = false): PortadaPhoto => ({ id: id(n), hidden, focal_x: 50, focal_y: 50 });
const job = (jobId: string, name: string, job_date: string, is_public: boolean, photos: PortadaPhoto[]): PortadaJobView => ({ id: jobId, name, job_date, is_public, photos });
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222", C = "33333333-3333-4333-8333-333333333333";
const jobs = [job(A, "Suzuki", "2026-01-01", true, [photo(1), photo(2, true), photo(3)]), job(B, "Audi", "2026-01-01", true, [photo(4, true)]), job(C, "Mercedes", "2026-02-01", false, [photo(5)])];
const render = (props: { jobs?: PortadaJobView[]; pinnedId?: string | null; featured?: PortadaFeatured | null } = {}) =>
  renderToStaticMarkup(createElement(PortadaScreen, { jobs: props.jobs ?? jobs, pinnedId: props.pinnedId ?? null, featured: props.featured ?? null }));

describe("pantalla «Portada»", () => {
  it("muestra cada trabajo como en la web, con el recuento del muro y los interruptores", () => {
    const markup = render();
    expect(markup).toContain("2 en el muro de 3");
    expect(markup).toContain("0 en el muro de 1");
    expect(markup).toContain("No sale en el muro: sin fotos visibles");
    expect(markup.match(/<span>Publicado<\/span>/g)).toHaveLength(3);
    expect(markup.match(/<span>Fijar arriba<\/span>/g)).toHaveLength(2);
  });
  it("los trabajos privados van atenuados, con marca «Privado», sin acciones de foto ni «Fijar arriba»", () => {
    const markup = render();
    const privateSection = markup.slice(markup.indexOf('class="portada-job is-private"'));
    expect(privateSection).toContain("Privado");
    expect(privateSection).not.toContain("Fijar arriba");
    expect(privateSection).not.toContain('type="button" class="portada-photo"');
    expect(privateSection).toMatch(/<input type="checkbox"[^>]*\/><span>Publicado<\/span>/);
    expect(privateSection).not.toMatch(/checked=""/);
  });
  it("marca el trabajo fijado y deja marcado su interruptor", () => {
    const markup = render({ pinnedId: B });
    expect(markup).toContain('<span class="badge published">Fijado</span>');
    expect(markup.match(/checked=""/g)?.length).toBe(3);
  });
  it("cada foto se anuncia con su posición, estado y es una pieza seleccionable", () => {
    const markup = render();
    expect(markup).toContain('aria-label="Foto 1 de 3. Tocar para seleccionar"');
    expect(markup).toContain('aria-label="Foto 2 de 3, oculta en el muro. Tocar para seleccionar"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain(">Oculta<");
    expect(markup).toContain('class="portada-tile is-hidden"');
  });
  it("sin transformación guardada invita a elegir y no se puede destacar todavía", () => {
    const markup = render();
    expect(markup).toContain("Ahora la portada muestra solo el título.");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Destacar en portada<\/button>/);
    expect(markup).not.toContain("Quitar de portada");
  });
  it("con transformación guardada muestra Antes/Después, permite que una sea oculta del muro y ofrece quitarla", () => {
    const markup = render({ featured: { jobId: A, beforeId: id(1), afterId: id(2) } });
    expect(markup).toContain("En portada ahora mismo.");
    expect(markup).toContain("Quitar de portada");
    expect(markup).toContain("Antes: foto 1 de Suzuki");
    expect(markup).toContain("Después: foto 2 de Suzuki");
    expect(markup).toContain(">Antes<");
    expect(markup).toContain(">Después<");
    expect(markup).toContain("En portada</span>");
    expect(markup).toContain('aria-label="Foto 2 de 3, oculta en el muro, Después. Tocar para seleccionar"');
  });
  it("si el trabajo de la portada pasa a privado la selección se marca inactiva", () => {
    const privateCover = [{ ...jobs[0], is_public: false }, jobs[1], jobs[2]];
    expect(render({ jobs: privateCover, featured: { jobId: A, beforeId: id(1), afterId: id(3) } })).toContain("Inactiva: ese trabajo está privado.");
  });
  it("explica cómo reordenar con arrastre, flechas y teclado", () => {
    const markup = render();
    expect(markup).toContain("Mantén pulsada una foto");
    expect(markup).toContain("Mayús + ←/→");
  });
});
