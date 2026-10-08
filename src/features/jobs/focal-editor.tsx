"use client";
/* eslint-disable @next/next/no-img-element -- Fotos privadas autenticadas y vista previa fiel con el mismo object-fit/object-position del portfolio; next/image no aplica. */
import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

// Marco de la tarjeta del portfolio (relación de aspecto del recorte cover principal).
const FRAME = 4 / 3;
const PREVIEWS = [{ label: "Tarjeta", ratio: "4 / 3" }, { label: "Retrato", ratio: "4 / 5" }];
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type Focal = { x: number; y: number };

// Fracción de la foto que cubre el marco: solo se recorta el eje que sobra (igual que object-fit: cover).
export function frameFor(ratio: number) { return { visibleX: ratio > FRAME ? FRAME / ratio : 1, visibleY: ratio < FRAME ? ratio / FRAME : 1 }; }
// Posición normalizada (0–1) del puntero sobre la foto → punto focal que centra el marco en ese punto, sin salirse de la foto.
export function focalFromPointer(nx: number, ny: number, ratio: number, current: Focal): Focal {
  const { visibleX, visibleY } = frameFor(ratio);
  const left = clamp(nx - visibleX / 2, 0, 1 - visibleX), top = clamp(ny - visibleY / 2, 0, 1 - visibleY);
  return { x: visibleX < 1 ? Math.round((left / (1 - visibleX)) * 100) : current.x, y: visibleY < 1 ? Math.round((top / (1 - visibleY)) * 100) : current.y };
}

// Mueve el marco del portfolio sobre la foto completa. Solo guarda un punto focal (object-position): no recorta ni reprocesa nada.
export function FocalEditor({ jobId, mediaId, initial, width, height, onClose, onSaved }: {
  jobId: string; mediaId: string; initial: Focal; width: number | null; height: number | null; onClose: () => void; onSaved: (focal: Focal) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [focal, setFocal] = useState<Focal>(initial);
  const [ratio, setRatio] = useState(width && height ? width / height : 4 / 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useLayoutEffect(() => {
    const element = dialog.current; element?.showModal();
    return () => element?.close();
  }, []);
  const { visibleX, visibleY } = frameFor(ratio);
  const left = (focal.x / 100) * (1 - visibleX), top = (focal.y / 100) * (1 - visibleY);
  const src = `/app/api/photos/${mediaId}`;
  const objectPosition = `${focal.x}% ${focal.y}%`;
  function moveTo(clientX: number, clientY: number) {
    const rect = stage.current?.getBoundingClientRect(); if (!rect?.width || !rect.height) return;
    setFocal((current) => focalFromPointer((clientX - rect.left) / rect.width, (clientY - rect.top) / rect.height, ratio, current));
  }
  function down(event: PointerEvent<HTMLDivElement>) { dragging.current = true; event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus({ preventScroll: true }); moveTo(event.clientX, event.clientY); }
  function move(event: PointerEvent<HTMLDivElement>) { if (dragging.current) moveTo(event.clientX, event.clientY); }
  function up(event: PointerEvent<HTMLDivElement>) { dragging.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 2;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (event.key === "Home") { event.preventDefault(); setFocal({ x: 50, y: 50 }); return; }
    const change = delta[event.key]; if (!change) return;
    event.preventDefault();
    setFocal((current) => ({ x: visibleX < 1 ? clamp(current.x + change[0], 0, 100) : current.x, y: visibleY < 1 ? clamp(current.y + change[1], 0, 100) : current.y }));
  }
  async function save() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/app/api/jobs/${jobId}/photos/${mediaId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ focal_x: focal.x, focal_y: focal.y }) });
      const result: { error?: string } = await response.json().catch(() => ({ error: "La sesión ha terminado o no hay conexión. Reintenta." }));
      if (!response.ok) throw new Error(result.error || "No se pudo guardar el encuadre.");
      onSaved(focal); dialog.current?.close();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar el encuadre."); setBusy(false); }
  }
  const moved = focal.x !== initial.x || focal.y !== initial.y;
  const adjustable = visibleX < 1 || visibleY < 1;
  return <dialog ref={dialog} className="focal-dialog" aria-labelledby="focal-title" onClose={(event) => { if (!event.currentTarget.open) onClose(); }}>
    <div className="focal-head"><h2 id="focal-title">Ajustar encuadre</h2><p>{adjustable ? "Arrastra el marco a la zona que quieres que se vea en el portfolio." : "Esta foto cabe entera en el marco; no hay nada que ajustar."}</p></div>
    <div className="focal-body">
      <div ref={stage} className="focal-stage" style={{ aspectRatio: String(ratio), width: `min(100%, ${(52 * ratio).toFixed(2)}dvh)` }} tabIndex={adjustable ? 0 : -1} role="group" aria-label="Encuadre de la fotografía" aria-describedby="focal-help" onPointerDown={adjustable ? down : undefined} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={adjustable ? key : undefined}>
        <img src={src} alt="" draggable={false} onLoad={(event) => { const image = event.currentTarget; if (image.naturalWidth && image.naturalHeight) setRatio(image.naturalWidth / image.naturalHeight); }} />
        <div className="focal-frame" style={{ left: `${left * 100}%`, top: `${top * 100}%`, width: `${visibleX * 100}%`, height: `${visibleY * 100}%` }} />
      </div>
      <p className="focal-help" id="focal-help">{adjustable ? "Con teclado: flechas para mover, Mayús para saltos grandes, Inicio para centrar. " : ""}<span aria-live="polite">Horizontal {focal.x} % · Vertical {focal.y} %</span></p>
      <div className="focal-previews" role="group" aria-label="Así se verá en el portfolio">
        {PREVIEWS.map((preview) => <figure key={preview.label}><div style={{ aspectRatio: preview.ratio }}><img src={src} alt="" draggable={false} style={{ objectPosition }} /></div><figcaption>{preview.label}</figcaption></figure>)}
      </div>
    </div>
    <div className="save-feedback" aria-live="polite">{error && <p className="alert" role="alert">{error}</p>}</div>
    <div className="focal-actions">
      <button type="button" className="button secondary" disabled={busy || (focal.x === 50 && focal.y === 50)} onClick={() => setFocal({ x: 50, y: 50 })}>Restablecer al centro</button>
      <button type="button" className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Cancelar</button>
      <button type="button" className="button primary" disabled={busy || !moved} onClick={save}>{busy ? "Guardando…" : "Guardar encuadre"}</button>
    </div>
  </dialog>;
}
