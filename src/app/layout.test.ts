import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import RootLayout from "@/app/layout";

test("el layout raiz genera un documento en espanol y conserva su contenido", () => {
  const content = createElement("main", null, "Contenido de prueba");
  const markup = renderToStaticMarkup(RootLayout({ children: content }));

  expect(markup).toContain('<html lang="es">');
  expect(markup).toContain("<body><main>Contenido de prueba</main></body>");
});
