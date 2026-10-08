// Estado de entrada de cada foto del muro. Nunca se anima antes de que la imagen esté cargada y decodificada.
//  loading: la foto aún no está lista → hueco reservado en Metal con un brillo de carga.
//  queued:  lista pero fuera de pantalla → espera, oculta, sin animar.
//  rise:    lista y entra en pantalla → sube y aparece.
//  fade:    terminó de cargar cuando ya estaba en pantalla → aparece solo con fundido, sin desplazamiento.
export type PhotoEntry = "loading" | "queued" | "rise" | "fade";

export function photoEntry({ ready, visible, readyWhileVisible }: { ready: boolean; visible: boolean; readyWhileVisible: boolean }): PhotoEntry {
  if (!ready) return "loading";
  if (!visible) return "queued";
  return readyWhileVisible ? "fade" : "rise";
}
