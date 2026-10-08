"use client";
import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useSwipe } from "./use-swipe";

// Visor de fotos a pantalla completa compartido por la home pública y el área privada.
// Aquí vive solo el comportamiento (dialog nativo modal, teclado, deslizar, foco, miniaturas) y la estructura;
// cada visor aporta su propia «piel» CSS a partir del prefijo `skin` (pub-viewer / app-viewer): tipografía,
// colores y tokens propios, sin compartir estilos. La foto actual y las miniaturas las pinta quien lo usa
// (con sus propios loaders y variantes).
export type PhotoViewerProps = {
  skin: string;
  label: string;
  title: string;
  closeLabel?: string;
  index: number;
  count: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  photo: ReactNode;
  renderThumb: (index: number) => ReactNode;
};

const icon = { viewBox: "0 0 24 24", width: 28, height: 28, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function PhotoViewer({ skin, label, title, closeLabel = "Cerrar fotografías", index, count, onIndexChange, onClose, photo, renderThumb }: PhotoViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    // El dialog nativo ya devuelve el foco; se refuerza por si el navegador no había enfocado el botón al pulsarlo.
    return () => { element?.close(); if (opener && opener !== document.body && opener.isConnected) opener.focus(); };
  }, []);
  const step = (delta: number) => onIndexChange((index + delta + count) % count);
  const swipe = useSwipe((direction) => step(direction), count > 1);
  // Un cierre de cleanup puede llegar después de la reapertura de Strict Mode.
  return <dialog ref={dialog} className={skin} aria-label={label} onClose={(event) => { if (!event.currentTarget.open) onClose(); }} onKeyDown={(event) => { if (count < 2) return; if (event.key === "ArrowRight") step(1); if (event.key === "ArrowLeft") step(-1); }}>
    <header className={`${skin}-head`}>
      <p className={`${skin}-title`}>{title}</p>
      <span className={`${skin}-count`} aria-hidden="true">{index + 1} / {count}</span>
      <span className={`${skin}-status`} role="status">Fotografía {index + 1} de {count}</span>
      <button type="button" className={`${skin}-close`} aria-label={closeLabel} onClick={() => dialog.current?.close()}><svg {...icon}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
    </header>
    <div className={`${skin}-stage`} {...swipe}>
      {count > 1 && <button type="button" className={`${skin}-arrow ${skin}-prev`} aria-label="Fotografía anterior" onClick={() => step(-1)}><svg {...icon}><path d="M15 5l-7 7 7 7" /></svg></button>}
      <div className={`${skin}-photo`}>{photo}</div>
      {count > 1 && <button type="button" className={`${skin}-arrow ${skin}-next`} aria-label="Fotografía siguiente" onClick={() => step(1)}><svg {...icon}><path d="M9 5l7 7-7 7" /></svg></button>}
    </div>
    {count > 1 && <div className={`${skin}-thumbs`} role="group" aria-label="Seleccionar fotografía">{Array.from({ length: count }, (_, thumb) => <button type="button" key={thumb} className={thumb === index ? "active" : undefined} aria-label={`Ver fotografía ${thumb + 1}`} aria-pressed={thumb === index} onClick={() => onIndexChange(thumb)}>{renderThumb(thumb)}</button>)}</div>}
  </dialog>;
}
