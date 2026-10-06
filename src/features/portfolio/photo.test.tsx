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
