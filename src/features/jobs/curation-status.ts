// Línea de estado de portada de la ficha del trabajo (la gestión vive en la pantalla «Portada»).
export function curationStatus({ isPublic, inCover, hidden }: { isPublic: boolean; inCover: boolean; hidden: number }): string {
  const parts: string[] = [];
  if (inCover) parts.push(isPublic ? "En portada" : "Portada inactiva (privado)");
  if (hidden > 0) parts.push(`${hidden} ${hidden === 1 ? "foto oculta" : "fotos ocultas"}`);
  return parts.length ? parts.join(" · ") : "Sin ajustes de portada";
}
