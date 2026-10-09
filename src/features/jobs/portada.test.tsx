import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
import { PortadaScreen } from "./portada";
import type { PortadaFeatured, PortadaJobView, PortadaPhoto } from "./portada";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const photo = (n: number, hidden = false): PortadaPhoto => ({ id: id(n), hidden, focal_x: 50, focal_y: 50 });
const job = (jobId: string, name: string, job_date: string, is_public: boolean, photos: PortadaPhoto[], wall_position: number | null = is_public ? 0 : null): PortadaJobView => ({ id: jobId, name, job_date, is_public, wall_position, photos });
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222", C = "33333333-3333-4333-8333-333333333333";
const jobs = [job(A, "Suzuki", "2026-01-01", true, [photo(1), photo(2, true), photo(3)], 0), job(B, "Audi", "2026-01-01", true, [photo(4, true)], 1), job(C, "Mercedes", "2026-02-01", false, [photo(5)])];
const render = (props: { jobs?: PortadaJobView[]; featured?: PortadaFeatured | null; page?: number; offset?: number; publishedTotal?: number } = {}) =>
  renderToStaticMarkup(createElement(PortadaScreen, { jobs: props.jobs ?? jobs, featured: props.featured ?? null, page: props.page ?? 1, offset: props.offset ?? 0, publishedTotal: props.publishedTotal ?? 2 }));

describe("pantalla «Portada»", () => {
  it("muestra cada trabajo como en la web, con el recuento del muro y los interruptores", () => {
    const markup = render();
    expect(markup).toContain("2 en el muro de 3");
    expect(markup).toContain("0 en el muro de 1");
    expect(markup).toContain("No sale en el muro: sin fotos visibles");
    expect(markup.match(/<span>Publicado<\/span>/g)).toHaveLength(3);
    expect(markup).not.toContain("Fijar arriba"); expect(markup).not.toContain("Fijado");
  });
  it("los trabajos privados van atenuados, con marca «Privado», sin acciones de foto ni «Fijar arriba»", () => {
    const markup = render();
    const privateSection = markup.slice(markup.indexOf('class="portada-job is-private"'));
    expect(privateSection).toContain("Privado");
    expect(privateSection).not.toContain("Subir"); expect(privateSection).not.toContain("Bajar"); expect(privateSection).not.toContain("portada-handle");
    expect(privateSection).not.toContain('type="button" class="portada-photo"');
    expect(privateSection).toMatch(/<input type="checkbox"[^>]*\/><span>Publicado<\/span>/);
    expect(privateSection).not.toMatch(/checked=""/);
  });
  it("cada trabajo publicado muestra su posición y los controles de orden (asa, subir, bajar) con los extremos desactivados", () => {
    const markup = render();
    expect(markup).toContain('aria-label="Posición 1 en el muro"'); expect(markup).toContain('aria-label="Posición 2 en el muro"');
    expect(markup).toContain('aria-label="Mover Suzuki: mantener pulsado y arrastrar"');
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Subir Suzuki"/);
    expect(markup).toMatch(/<button[^>]*aria-label="Subir Audi"(?![^>]*disabled)/);
    expect(markup).toMatch(/<button[^>]*aria-label="Bajar Suzuki"(?![^>]*disabled)/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*aria-label="Bajar Audi"/);
  });
  it("en otra página la posición es absoluta y se puede subir al principio de la página anterior", () => {
    const markup = render({ page: 2, offset: 12, publishedTotal: 20, jobs: [jobs[0], jobs[1]] });
    expect(markup).toContain('aria-label="Posición 13 en el muro"'); expect(markup).toContain('aria-label="Posición 14 en el muro"');
    expect(markup).toMatch(/<button[^>]*aria-label="Subir Suzuki"(?![^>]*disabled)/);
    expect(markup).toMatch(/<button[^>]*aria-label="Bajar Audi"(?![^>]*disabled)/);
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
  it("no muestra texto de ayuda visible: las instrucciones de gestos son solo para lectores de pantalla", () => {
    const markup = render();
    expect(markup).not.toContain("El orden es el de la web");
    expect(markup).not.toContain("Mantén pulsada una foto y muévela");
    expect(markup).toMatch(/<p id="portada-hint" class="portada-sr">/);
    expect(markup).toContain("Mayús más flecha");
    expect(markup).toContain('aria-describedby="portada-hint"');
  });
});
