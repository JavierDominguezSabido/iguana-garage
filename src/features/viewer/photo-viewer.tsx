"use client";
import { Fragment, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent, ReactNode, SyntheticEvent } from "react";
import { flushSync } from "react-dom";
import { swipeDirection } from "./swipe";
import { canDrag, dragOffset, stripSlides, stripTarget } from "./strip";
import type { StripSlide } from "./strip";

// Visor de fotos a pantalla completa compartido por la home pública y el área privada.
// Aquí vive solo el comportamiento (dialog nativo modal, teclado, tira deslizante, foco, miniaturas) y la estructura;
// cada visor aporta su propia «piel» CSS a partir del prefijo `skin` (pub-viewer / app-viewer): tipografía,
// colores y tokens propios, sin compartir estilos. La foto completa y la miniatura las pinta quien lo usa
// (con sus propios loaders y variantes).
//
// Tira: se montan SOLO la foto actual y sus dos vecinas (nunca todas las del trabajo), cada una con el mismo
// sizes/variante que usará al mostrarse, para que al pasar ya estén descargadas y decodificadas. Mientras una foto
// no está lista se enseña al instante su miniatura (ya cargada en la tira de miniaturas), ampliada y difuminada;
// al cargar y decodificar se funde a la foto buena. Si falla, «Fotografía no disponible».
export type PhotoLoadHandlers = { retry: number; onLoad: (event: SyntheticEvent<HTMLImageElement>) => void; onError: () => void };
export type PhotoViewerProps = {
  skin: string;
  label: string;
  title: string;
  closeLabel?: string;
  index: number;
  count: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  renderPhoto: (index: number, handlers: PhotoLoadHandlers) => ReactNode;
  renderThumb: (index: number) => ReactNode;
};

const icon = { viewBox: "0 0 24 24", width: 28, height: 28, fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const MAX_RETRIES = 3;
const DECODE_STALL_MS = 1500;
const SETTLE_MS = 240; // un poco más que la transición CSS (.22 s)
const DRAG_DEADZONE_PX = 8;
const VELOCITY_WINDOW_MS = 100;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function ViewerSlide({ skin, slide, current, renderPhoto, renderThumb }: { skin: string; slide: StripSlide; current: boolean; renderPhoto: PhotoViewerProps["renderPhoto"]; renderThumb: PhotoViewerProps["renderThumb"] }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const handlers: PhotoLoadHandlers = {
    retry,
    // «Lista» = cargada y decodificada (con tope por si decode() se colgara en una imagen ya cargada).
    onLoad: (event) => {
      const image = event.currentTarget;
      void Promise.race([image.decode().catch(() => {}), new Promise<void>((resolve) => window.setTimeout(resolve, DECODE_STALL_MS))]).then(() => setStatus("ready"));
    },
    onError: () => setStatus("failed"),
  };
  return <div className={`${skin}-slide`} style={{ "--o": slide.offset } as CSSProperties} data-state={status} data-current={current ? "true" : undefined} aria-hidden={current ? undefined : true} inert={current ? undefined : true}>
    <div className={`${skin}-ph`}>{renderThumb(slide.index)}</div>
    <div className={`${skin}-full`}><Fragment key={retry}>{renderPhoto(slide.index, handlers)}</Fragment></div>
    {status === "failed" && <div className={`${skin}-failed`}><p>Fotografía no disponible.</p>{retry < MAX_RETRIES && <button type="button" onClick={() => { setRetry(retry + 1); setStatus("loading"); }}>Reintentar foto</button>}</div>}
  </div>;
}

export function PhotoViewer({ skin, label, title, closeLabel = "Cerrar fotografías", index, count, onIndexChange, onClose, renderPhoto, renderThumb }: PhotoViewerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointer: number; x: number; y: number; samples: { x: number; t: number }[]; active: boolean; width: number } | null>(null);
  const finishing = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    // El dialog nativo ya devuelve el foco; se refuerza por si el navegador no había enfocado el botón al pulsarlo.
    return () => { element?.close(); if (opener && opener !== document.body && opener.isConnected) opener.focus(); };
  }, []);

  const slides = stripSlides(index, count);
  const setDx = (pixels: number) => track.current?.style.setProperty("--dx", `${pixels}px`);
  const animating = (on: boolean) => { if (on) track.current?.setAttribute("data-animating", ""); else track.current?.removeAttribute("data-animating"); };

  // Encaja en la foto vecina (direction ±1) con una transición corta, o vuelve a su sitio (0). Con movimiento reducido es instantáneo.
  function settle(direction: 1 | -1 | 0, width: number) {
    const target = direction ? stripTarget(index, count, direction) : index;
    const instant = reducedMotion();
    if (instant || !width) { animating(false); if (direction) flushSync(() => onIndexChange(target)); setDx(0); return; }
    animating(true); setDx(-direction * width);
    const done = () => {
      window.clearTimeout(timer); finishing.current = null; animating(false);
      // Mismo instante: la foto vecina pasa a ser la actual y la tira vuelve a 0, sin salto visible.
      if (direction) flushSync(() => onIndexChange(target));
      setDx(0);
    };
    const timer = window.setTimeout(done, SETTLE_MS);
    finishing.current = done;
  }
  // Flechas y teclado: misma transición corta si la foto de destino es la vecina montada; si no, cambio directo.
  function go(direction: 1 | -1) {
    if (count < 2 || finishing.current) return;   // durante el encaje (~240 ms) se ignora la entrada nueva
    const target = stripTarget(index, count, direction);
    const neighbour = slides.some((slide) => slide.index === target && slide.offset === direction);
    if (neighbour) settle(direction, track.current?.parentElement?.clientWidth ?? 0); else onIndexChange(target);
  }

  function dragStart(event: PointerEvent<HTMLElement>) {
    if (count < 2 || event.pointerType === "mouse" || finishing.current) return;
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, samples: [{ x: event.clientX, t: event.timeStamp }], active: false, width: track.current?.parentElement?.clientWidth ?? 0 };
  }
  function dragMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    const dx = event.clientX - current.x;
    if (!current.active && Math.abs(dx) < DRAG_DEADZONE_PX) return;
    current.active = true; animating(false);
    current.samples.push({ x: event.clientX, t: event.timeStamp });
    while (current.samples.length > 2 && event.timeStamp - current.samples[0].t > VELOCITY_WINDOW_MS) current.samples.shift();
    setDx(dragOffset(dx, current.width, canDrag(index, count, dx < 0 ? 1 : -1)));
  }
  function dragEnd(event: PointerEvent<HTMLElement>, cancelled: boolean) {
    const current = drag.current;
    if (!current || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (!current.active) return;                       // un toque: no cambia nada
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    const first = current.samples[0], last = current.samples[current.samples.length - 1];
    const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
    const direction = cancelled ? 0 : swipeDirection(dx, dy, { width: current.width, velocity });
    settle(direction && canDrag(index, count, direction) ? direction : 0, current.width);
  }

  // Un cierre de cleanup puede llegar después de la reapertura de Strict Mode.
  return <dialog ref={dialog} className={skin} aria-label={label} onClose={(event) => { if (!event.currentTarget.open) onClose(); }} onKeyDown={(event) => { if (count < 2) return; if (event.key === "ArrowRight") go(1); if (event.key === "ArrowLeft") go(-1); }}>
    <header className={`${skin}-head`}>
      <p className={`${skin}-title`}>{title}</p>
      <span className={`${skin}-count`} aria-hidden="true">{index + 1} / {count}</span>
      <span className={`${skin}-status`} role="status">Fotografía {index + 1} de {count}</span>
      <button type="button" className={`${skin}-close`} aria-label={closeLabel} onClick={() => dialog.current?.close()}><svg {...icon}><path d="M6 6l12 12M18 6L6 18" /></svg></button>
    </header>
    <div className={`${skin}-stage`} onPointerDown={dragStart} onPointerMove={dragMove} onPointerUp={(event) => dragEnd(event, false)} onPointerCancel={(event) => dragEnd(event, true)}>
      {count > 1 && <button type="button" className={`${skin}-arrow ${skin}-prev`} aria-label="Fotografía anterior" onClick={() => go(-1)}><svg {...icon}><path d="M15 5l-7 7 7 7" /></svg></button>}
      <div className={`${skin}-photo`}>
        <div ref={track} className={`${skin}-track`}>{slides.map((slide) => <ViewerSlide key={slide.index} skin={skin} slide={slide} current={slide.offset === 0} renderPhoto={renderPhoto} renderThumb={renderThumb} />)}</div>
      </div>
      {count > 1 && <button type="button" className={`${skin}-arrow ${skin}-next`} aria-label="Fotografía siguiente" onClick={() => go(1)}><svg {...icon}><path d="M9 5l7 7-7 7" /></svg></button>}
    </div>
    {count > 1 && <div className={`${skin}-thumbs`} role="group" aria-label="Seleccionar fotografía">{Array.from({ length: count }, (_, thumb) => <button type="button" key={thumb} className={thumb === index ? "active" : undefined} aria-label={`Ver fotografía ${thumb + 1}`} aria-pressed={thumb === index} onClick={() => onIndexChange(thumb)}>{renderThumb(thumb)}</button>)}</div>}
  </dialog>;
}
