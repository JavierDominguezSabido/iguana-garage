import { describe, expect, it } from "vitest";
import { curationStatus } from "./curation-status";

describe("línea de estado de portada de la ficha", () => {
  it("resume portada, fijado y fotos ocultas", () => {
    expect(curationStatus({ isPublic: true, pinned: true, inCover: true, hidden: 2 })).toBe("En portada · Fijado · 2 fotos ocultas");
    expect(curationStatus({ isPublic: true, pinned: false, inCover: true, hidden: 1 })).toBe("En portada · 1 foto oculta");
    expect(curationStatus({ isPublic: true, pinned: true, inCover: false, hidden: 0 })).toBe("Fijado");
  });
  it("sin ajustes lo dice y un trabajo privado marca sus ajustes como inactivos", () => {
    expect(curationStatus({ isPublic: true, pinned: false, inCover: false, hidden: 0 })).toBe("Sin ajustes de portada");
    expect(curationStatus({ isPublic: false, pinned: true, inCover: true, hidden: 0 })).toBe("Portada inactiva (privado) · Fijado (inactivo)");
  });
});
