import { expect, it } from "vitest";
import { photoEntry } from "./photo-entry";

it("mientras la foto no está cargada y decodificada, el hueco muestra el estado de carga (esté o no en pantalla)", () => {
  expect(photoEntry({ ready: false, visible: false, readyWhileVisible: false })).toBe("loading");
  expect(photoEntry({ ready: false, visible: true, readyWhileVisible: false })).toBe("loading");
});

it("lista pero fuera de pantalla: espera en cola, sin animar todavía", () => {
  expect(photoEntry({ ready: true, visible: false, readyWhileVisible: false })).toBe("queued");
});

it("lista y entra en pantalla: sube y aparece", () => {
  expect(photoEntry({ ready: true, visible: true, readyWhileVisible: false })).toBe("rise");
});

it("si terminó de cargar cuando ya estaba en pantalla, aparece solo con fundido, sin desplazamiento", () => {
  expect(photoEntry({ ready: true, visible: true, readyWhileVisible: true })).toBe("fade");
  // Si se sale de pantalla tras cargar (ya en cola), el fundido ya no aplica: al volver sube normalmente.
  expect(photoEntry({ ready: true, visible: false, readyWhileVisible: true })).toBe("queued");
});
