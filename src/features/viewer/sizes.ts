// Tamaño pintado de la foto en el visor a pantalla completa (object-fit: contain), para el atributo sizes.
// Las constantes reflejan el CSS de cada visor: cabecera + miniaturas (alto fijo) y las dos columnas de flechas
// laterales de escritorio (desde 900 px). En móvil las flechas se superponen y la foto ocupa todo el ancho.
export const VIEWER_CHROME_PX = 148;
export const VIEWER_ARROWS_PX = 176;

export function viewerStageSizes(ratio?: number): string {
  const desktopWidth = `calc(100vw - ${VIEWER_ARROWS_PX}px)`;
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return `(min-width: 900px) ${desktopWidth}, 100vw`;
  // contain pinta como máximo (alto disponible) * proporción, dentro del mismo marco.
  const height = `calc((100dvh - ${VIEWER_CHROME_PX}px) * ${Number(ratio.toFixed(4))})`;
  return `(min-width: 900px) min(${desktopWidth}, ${height}), min(100vw, ${height})`;
}
