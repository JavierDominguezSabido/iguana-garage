import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { PublicJob } from "./contract";
import { BeforeAfter } from "./before-after";
import { HeroFan } from "./fan";
import { FloatingContact } from "./floating-contact";
import { Provisional } from "./provisional";

const id = (n: number, k = 0) => `${String(n).repeat(8)}-${String(k).repeat(4)}-4111-8111-111111111111`;
const job = (n: number, photos: number): PublicJob => ({ id: id(n), name: `Trabajo ${n}`, job_date: "2026-01-15", description: null,
  media: Array.from({ length: photos }, (_, k) => ({ id: id(n, k + 1), path: `${id(n)}/${id(n, k + 1)}.webp`, focal_x: 30, focal_y: 60 })) });
const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("abanico de la portada", () => {
  const markup = html(createElement(HeroFan, { jobs: [job(1, 2), job(2, 1)] }));
  it("es una navegación con una carta enlazada por trabajo que lleva a su banda", () => {
    expect(markup).toContain('<nav class="pub-fan" aria-label="Trabajos en portada">');
    expect(markup).toContain(`href="#trabajo-${id(1)}"`); expect(markup).toContain(`href="#trabajo-${id(2)}"`);
    expect(markup.match(/class="pub-card"/g)).toHaveLength(3);
  });
  it("las cartas repetidas de un mismo trabajo son decorativas y no reciben foco", () => {
    expect(markup.match(/aria-hidden="true" tabindex="-1"/gi)).toHaveLength(1);
  });
  it("las fotos son decorativas (el nombre ya está en la carta) y respetan el punto focal", () => {
    expect(markup).toContain('alt=""'); expect(markup).toContain("object-position:30% 60%");
  });
  it("sin fotos no hay abanico", () => {
    expect(html(createElement(HeroFan, { jobs: [job(1, 0)] }))).toBe("");
  });
});

describe("Antes y Después", () => {
  const work = job(3, 3);
  const markup = html(createElement(BeforeAfter, { transformation: { job: work, before: work.media[2], after: work.media[0] } }));
  it("dos pantallas con la pareja elegida, rotuladas y con texto alternativo", () => {
    expect(markup).toContain(`alt="Trabajo 3, antes"`); expect(markup).toContain(`alt="Trabajo 3, después"`);
    expect(markup).toContain("<figcaption class=\"pub-ba-label\">Antes</figcaption>");
    expect(markup).toContain("<figcaption class=\"pub-ba-label\">Después</figcaption>");
    expect(markup.indexOf(work.media[2].id)).toBeLessThan(markup.indexOf(work.media[0].id));
  });
  it("tiene nombre accesible y «Ver fotos» abre el visor", () => {
    expect(markup).toContain("Antes y después: Trabajo 3");
    expect(markup).toMatch(/aria-haspopup="dialog"[^>]*>.*Ver fotos<span class="pub-sr-only"> de Trabajo 3<\/span>/);
  });
});

describe("botón flotante de WhatsApp", () => {
  const markup = html(createElement(FloatingContact, { href: "https://wa.me/34600000000?text=Hola" }));
  it("es un enlace externo seguro, redondo, con nombre accesible y oculto hasta salir de la portada", () => {
    expect(markup).toContain('class="pub-fab"'); expect(markup).toContain('data-visible="false"');
    expect(markup).toContain('href="https://wa.me/34600000000?text=Hola"');
    expect(markup).toContain('target="_blank"'); expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('aria-label="Escríbenos por WhatsApp (abre WhatsApp en otra pestaña)"');
    expect(markup).toContain('<svg'); expect(markup).toContain('aria-hidden="true"');
  });
});

it("los textos pendientes de aprobar se marcan como provisionales", () => {
  expect(html(createElement(Provisional, null, "Texto nuevo"))).toBe('<span class="pub-prov">Texto nuevo<span class="pub-prov-mark" aria-hidden="true">[texto provisional]</span></span>');
});
