"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { send } from "./api-client";
import { displayDate } from "./format";
import { focalStyle } from "./focal";
import { sortPortadaJobs } from "./portada-order";
import { dropIndex, edgeScrollSpeed, keyboardTarget, LONG_PRESS_MS, MOUSE_DRAG_THRESHOLD, moveItem, movedBeyond, TOUCH_SLOP } from "./reorder";

export type PortadaPhoto = { id: string; hidden: boolean; focal_x: number; focal_y: number };
export type PortadaJobView = { id: string; name: string; job_date: string; is_public: boolean; photos: PortadaPhoto[] };
export type PortadaFeatured = { jobId: string; beforeId: string; afterId: string };
type Draft = { jobId: string | null; beforeId: string | null; afterId: string | null };
type Slot = "before" | "after";
const EMPTY: Draft = { jobId: null, beforeId: null, afterId: null };
const SLOT_LABEL: Record<Slot, string> = { before: "Antes", after: "Después" };
const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;
const errorText = (failure: unknown) => failure instanceof Error ? failure.message : "No se pudo guardar. Reintenta.";

type DragState = { id: string; index: number; startX: number; startY: number; startScroll: number; pointerId: number; touch: boolean; active: boolean; centers: number[]; lastX: number; raf: number; timer: number; target: HTMLElement };

// Fila de fotos de un trabajo, en el orden en que se verán en la web. Arrastrar (táctil: mantener pulsado y mover; ratón:
// arrastrar), Mayús + ←/→ con el teclado y, como alternativa accesible, los botones de la barra de acciones.
function PhotoRow({ name, photos, interactive, selectedId, chipsOf, onSelect, onMove }: {
  name: string; photos: PortadaPhoto[]; interactive: boolean; selectedId: string | null; chipsOf: (photo: PortadaPhoto) => string[]; onSelect: (id: string | null) => void; onMove: (from: number, to: number) => void;
}) {
  const row = useRef<HTMLUListElement>(null);
  const tiles = useRef(new Map<string, HTMLLIElement>());
  const state = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const focusAfter = useRef<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; to: number } | null>(null);

  // En táctil, una vez activado el arrastre hay que impedir que la página se desplace con el dedo (listener no pasivo).
  useEffect(() => {
    const element = row.current; if (!element) return;
    const block = (event: TouchEvent) => { if (state.current?.active) event.preventDefault(); };
    element.addEventListener("touchmove", block, { passive: false });
    return () => element.removeEventListener("touchmove", block);
  }, []);
  // Tras mover con el teclado o el ratón, el foco sigue a la foto en su nueva posición.
  useEffect(() => {
    if (!focusAfter.current) return;
    tiles.current.get(focusAfter.current)?.querySelector("button")?.focus({ preventScroll: false });
    focusAfter.current = null;
  });
  useEffect(() => () => { const st = state.current; if (st) { window.clearTimeout(st.timer); cancelAnimationFrame(st.raf); } }, []);

  const scrolled = (st: DragState) => (row.current?.scrollLeft ?? 0) - st.startScroll;
  const targetOf = (st: DragState) => dropIndex(st.centers.map((center) => center - scrolled(st)), st.lastX, st.index);
  const refresh = (st: DragState) => setDrag({ id: st.id, dx: st.lastX - st.startX + scrolled(st), to: targetOf(st) });
  function activate(st: DragState) {
    if (state.current !== st || st.active) return;
    st.active = true; suppressClick.current = true;
    st.centers = photos.map((photo) => { const rect = tiles.current.get(photo.id)?.getBoundingClientRect(); return rect ? rect.left + rect.width / 2 : 0; });
    st.startScroll = row.current?.scrollLeft ?? 0;
    try { st.target.setPointerCapture(st.pointerId); } catch { /* el puntero ya no existe */ }
    navigator.vibrate?.(15);
    refresh(st);
    const loop = () => {
      if (state.current !== st || !st.active) return;
      const element = row.current;
      if (element) { const rect = element.getBoundingClientRect(); const speed = edgeScrollSpeed(st.lastX, rect.left, rect.right); if (speed) { element.scrollLeft += speed; refresh(st); } }
      st.raf = requestAnimationFrame(loop);
    };
    st.raf = requestAnimationFrame(loop);
  }
  function finish(commit: boolean) {
    const st = state.current; if (!st) return;
    window.clearTimeout(st.timer); cancelAnimationFrame(st.raf); state.current = null;
    if (!st.active) return;
    const to = targetOf(st);
    setDrag(null);
    window.setTimeout(() => { suppressClick.current = false; }, 60);
    if (commit && to !== st.index) { focusAfter.current = st.id; onMove(st.index, to); }
  }
  function down(event: PointerEvent<HTMLButtonElement>, index: number, id: string) {
    if (!interactive || (event.pointerType === "mouse" && event.button !== 0)) return;
    const touch = event.pointerType !== "mouse";
    const st: DragState = { id, index, startX: event.clientX, startY: event.clientY, startScroll: row.current?.scrollLeft ?? 0, pointerId: event.pointerId, touch, active: false, centers: [], lastX: event.clientX, raf: 0, timer: 0, target: event.currentTarget };
    state.current = st;
    if (touch) st.timer = window.setTimeout(() => activate(st), LONG_PRESS_MS);
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const st = state.current; if (!st || event.pointerId !== st.pointerId) return;
    st.lastX = event.clientX;
    if (!st.active) {
      if (!movedBeyond(event.clientX - st.startX, event.clientY - st.startY, st.touch ? TOUCH_SLOP : MOUSE_DRAG_THRESHOLD)) return;
      // Táctil: el dedo se movió antes de tiempo, es un desplazamiento de la página o de la fila. Ratón: empieza el arrastre.
      if (st.touch) { window.clearTimeout(st.timer); state.current = null; } else activate(st);
      return;
    }
    refresh(st);
  }
  function key(event: KeyboardEvent<HTMLButtonElement>, index: number, id: string) {
    const target = keyboardTarget(event.key, event.shiftKey, index, photos.length);
    if (target === null) return;
    event.preventDefault(); focusAfter.current = id; onMove(index, target);
  }

  const others = drag ? photos.filter((photo) => photo.id !== drag.id) : [];
  const dropBefore = drag && drag.to < others.length ? others[drag.to].id : null;
  const dropAfter = drag && drag.to >= others.length ? others[others.length - 1]?.id ?? null : null;
  return <ul ref={row} className={`portada-row${drag ? " is-dragging" : ""}`} aria-label={`Fotos de ${name} en el orden de la web`}>
    {photos.map((photo, index) => {
      const chips = chipsOf(photo); const selected = selectedId === photo.id; const dragged = drag?.id === photo.id;
      const className = ["portada-tile", photo.hidden && "is-hidden", selected && "is-selected", dragged && "is-lifted", dropBefore === photo.id && "drop-before", dropAfter === photo.id && "drop-after"].filter(Boolean).join(" ");
      const content = <>
        <Image unoptimized src={`/app/api/photos/${photo.id}`} width={208} height={260} alt="" draggable={false} style={focalStyle(photo)} />
        <span className="portada-num">{index + 1}</span>
        {(photo.hidden || chips.length > 0) && <span className="portada-chips">{chips.map((chip) => <span key={chip} className="portada-chip portada-chip-cover">{chip}</span>)}{photo.hidden && <span className="portada-chip">Oculta</span>}</span>}
      </>;
      return <li key={photo.id} ref={(element) => { if (element) tiles.current.set(photo.id, element); else tiles.current.delete(photo.id); }} className={className} style={dragged && drag ? { transform: `translateX(${drag.dx}px) scale(1.05)` } : undefined}>
        {interactive
          ? <button type="button" className="portada-photo" aria-pressed={selected} aria-label={`Foto ${index + 1} de ${photos.length}${photo.hidden ? ", oculta en el muro" : ""}${chips.length ? `, ${chips.join(" y ")}` : ""}. ${selected ? "Seleccionada" : "Tocar para seleccionar"}`}
            onPointerDown={(event) => down(event, index, photo.id)} onPointerMove={move} onPointerUp={() => finish(true)} onPointerCancel={() => finish(false)} onKeyDown={(event) => key(event, index, photo.id)} onContextMenu={(event) => event.preventDefault()}
            onClick={() => { if (!suppressClick.current) onSelect(selected ? null : photo.id); }}>{content}</button>
          : <div className="portada-photo" aria-label={`${name}, foto ${index + 1}${photo.hidden ? " (oculta)" : ""}`}>{content}</div>}
      </li>;
    })}
    {!photos.length && <li className="portada-empty">Este trabajo no tiene fotografías.</li>}
  </ul>;
}

// Pantalla «Portada»: todo el control de la página principal en un solo sitio. Cada cambio se guarda al momento.
export function PortadaScreen({ jobs: initialJobs, pinnedId: initialPinned, featured }: { jobs: PortadaJobView[]; pinnedId: string | null; featured: PortadaFeatured | null }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [pinnedId, setPinnedId] = useState(initialPinned);
  const [saved, setSaved] = useState<PortadaFeatured | null>(featured);
  const [draft, setDraft] = useState<Draft>(featured ?? EMPTY);
  const [selected, setSelected] = useState<{ jobId: string; photoId: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const latest = useRef(jobs);
  useEffect(() => { latest.current = jobs; }, [jobs]);
  const confirmed = useRef(new Map(initialJobs.map((job) => [job.id, job.photos.map((photo) => photo.id)])));
  const queues = useRef(new Map<string, Promise<void>>());
  const generations = useRef(new Map<string, number>());

  async function run(key: string, action: () => Promise<void>, done: () => void) {
    setBusy(key); setError(""); setMessage("");
    try { await action(); done(); } catch (failure) { setError(errorText(failure)); } finally { setBusy(null); }
  }
  const idle = busy === null;
  const photoOf = (id: string | null) => { for (const job of jobs) { const photo = job.photos.find((item) => item.id === id); if (photo) return { job, photo, index: job.photos.indexOf(photo) }; } return null; };

  function reorder(jobId: string, from: number, to: number) {
    const job = latest.current.find((item) => item.id === jobId); if (!job) return;
    const photos = moveItem(job.photos, from, to); if (photos === job.photos) return;
    const ids = photos.map((photo) => photo.id);
    latest.current = latest.current.map((item) => item.id === jobId ? { ...item, photos } : item);
    setJobs(latest.current); setError("");
    setMessage(`Foto movida a la posición ${to + 1} de ${photos.length}.`);
    const generation = generations.current.get(jobId) ?? 0;
    const task = async () => {
      if ((generations.current.get(jobId) ?? 0) !== generation) return;
      try { await send(`/app/api/jobs/${jobId}/order`, "PATCH", { order: ids }); confirmed.current.set(jobId, ids); }
      catch (failure) {
        // Marcha atrás al último orden confirmado y se descartan los guardados pendientes de este trabajo.
        generations.current.set(jobId, generation + 1);
        const order = confirmed.current.get(jobId) ?? [];
        setJobs((current) => current.map((item) => item.id === jobId ? { ...item, photos: [...item.photos].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) } : item));
        setError(errorText(failure)); setMessage("");
      }
    };
    queues.current.set(jobId, (queues.current.get(jobId) ?? Promise.resolve()).then(task));
  }

  const toggleHidden = (job: PortadaJobView, photo: PortadaPhoto) => run(`hide:${photo.id}`, () => send(`/app/api/jobs/${job.id}/photos/${photo.id}`, "PATCH", { hidden: !photo.hidden }), () => {
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, photos: item.photos.map((entry) => entry.id === photo.id ? { ...entry, hidden: !photo.hidden } : entry) } : item));
    const inCover = (saved?.jobId === job.id && (saved.beforeId === photo.id || saved.afterId === photo.id)) || (draft.jobId === job.id && (draft.beforeId === photo.id || draft.afterId === photo.id));
    setMessage(photo.hidden ? "Foto visible en el muro." : inCover ? "Foto oculta del muro; sigue en la portada." : "Foto oculta del muro.");
  });
  const togglePin = (job: PortadaJobView) => run(`pin:${job.id}`, () => send("/app/api/portfolio", "PATCH", { pinned_job_id: pinnedId === job.id ? null : job.id }), () => {
    const next = pinnedId === job.id ? null : job.id;
    setPinnedId(next); setJobs((current) => sortPortadaJobs(current, next)); setMessage(next ? "Fijado arriba del muro." : "Ya no está fijado.");
  });
  const togglePublished = (job: PortadaJobView) => run(`pub:${job.id}`, () => send(`/app/api/jobs/${job.id}`, "PATCH", { phase: "publish", published: !job.is_public }), () => {
    const next = !job.is_public;
    setJobs((current) => sortPortadaJobs(current.map((item) => item.id === job.id ? { ...item, is_public: next } : item), pinnedId));
    if (!next && selected?.jobId === job.id) setSelected(null);
    const dormant = !next && (pinnedId === job.id || saved?.jobId === job.id);
    setMessage(next ? "Publicado." : `Privado.${dormant ? " Su ajuste de portada queda inactivo hasta que lo publiques." : ""}`);
  });

  function pickSlot(job: PortadaJobView, photo: PortadaPhoto, slot: Slot) {
    setError(""); setMessage("");
    const other: Slot = slot === "before" ? "after" : "before";
    const key = (value: Slot) => value === "before" ? "beforeId" : "afterId";
    const switched = draft.jobId !== job.id;
    const base: Draft = switched ? { ...EMPTY, jobId: job.id } : { ...draft };
    if (base[key(other)] === photo.id) base[key(other)] = null;
    base[key(slot)] = photo.id;
    setDraft(base);
    if (switched && draft.jobId) setMessage(`Cambiaste de trabajo: elige también el ${SLOT_LABEL[other]} en «${job.name}».`);
  }
  const draftReady = !!draft.jobId && !!draft.beforeId && !!draft.afterId;
  const unchanged = !!saved && saved.jobId === draft.jobId && saved.beforeId === draft.beforeId && saved.afterId === draft.afterId;
  const feature = () => run("feature", () => send("/app/api/portfolio", "PATCH", { featured: { job_id: draft.jobId, before_id: draft.beforeId, after_id: draft.afterId } }), () => {
    setSaved({ jobId: draft.jobId!, beforeId: draft.beforeId!, afterId: draft.afterId! }); setMessage("Transformación destacada en la portada.");
  });
  const unfeature = () => run("feature", () => send("/app/api/portfolio", "PATCH", { featured: null }), () => { setSaved(null); setDraft(EMPTY); setMessage("La portada vuelve al título solo."); });

  const chipsFor = (job: PortadaJobView) => (photo: PortadaPhoto) => draft.jobId === job.id ? [draft.beforeId === photo.id && "Antes", draft.afterId === photo.id && "Después"].filter((chip): chip is string => !!chip) : [];
  const coverJob = jobs.find((job) => job.id === saved?.jobId);
  const slotPhoto = (slot: Slot) => photoOf(slot === "before" ? draft.beforeId : draft.afterId);
  const savedInactive = !!saved && !!coverJob && !coverJob.is_public;

  return <div className="portada">
    <section className="portada-cover" aria-labelledby="portada-cover-title">
      <h2 id="portada-cover-title">Transformación en portada</h2>
      <div className="portada-slots" role="group" aria-label="Antes y después de la portada">
        {(["before", "after"] as const).map((slot) => { const found = slotPhoto(slot); return <div key={slot} className="portada-slot">
          {found ? <Image unoptimized src={`/app/api/photos/${found.photo.id}`} width={208} height={260} alt={`${SLOT_LABEL[slot]}: foto ${found.index + 1} de ${found.job.name}`} style={focalStyle(found.photo)} /> : <span className="slot-empty">Sin elegir</span>}
          <span className="slot-label">{SLOT_LABEL[slot]}</span>
        </div>; })}
      </div>
      <p className="field-help" aria-live="polite">
        {draft.jobId ? <>Trabajo: <strong>{jobs.find((job) => job.id === draft.jobId)?.name}</strong>. </> : "Elige una foto en un trabajo publicado y púlsala como Antes o Después. "}
        {saved ? (savedInactive ? "Inactiva: ese trabajo está privado. Volverá a mostrarse al publicarlo." : unchanged ? "En portada ahora mismo." : "Hay cambios sin destacar.") : "Ahora la portada muestra solo el título."}
      </p>
      <div className="portada-actions">
        <button type="button" className="button primary" disabled={!idle || !draftReady || unchanged} onClick={feature}>{busy === "feature" ? "Guardando…" : saved ? "Actualizar portada" : "Destacar en portada"}</button>
        {saved && <button type="button" className="button secondary" disabled={!idle} onClick={unfeature}>Quitar de portada</button>}
      </div>
    </section>
    <p className="field-help portada-help">El orden es el de la web. Mantén pulsada una foto y muévela, o selecciónala y usa las flechas. Con teclado: Mayús + ←/→.</p>
    {jobs.map((job) => {
      const visible = job.photos.filter((photo) => !photo.hidden).length;
      const sel = selected?.jobId === job.id ? photoOf(selected.photoId) : null;
      const selIndex = sel?.index ?? -1;
      const isPinned = pinnedId === job.id;
      const mine = draft.jobId === job.id;
      return <section key={job.id} className={`portada-job${job.is_public ? "" : " is-private"}`} aria-labelledby={`pj-${job.id}`}>
        <header className="portada-job-head">
          <div><h2 id={`pj-${job.id}`}>{job.name}</h2>
            <p className="portada-meta"><time dateTime={job.job_date}>{displayDate(job.job_date)}</time> · {job.is_public ? `${visible} en el muro de ${job.photos.length}` : plural(job.photos.length, "foto", "fotos")}</p>
            <p className="portada-badges">{!job.is_public && <span className="badge">Privado</span>}{isPinned && <span className="badge published">Fijado</span>}{saved?.jobId === job.id && <span className="badge published">En portada</span>}{job.is_public && visible === 0 && <span className="badge">No sale en el muro: sin fotos visibles</span>}</p>
          </div>
          <div className="portada-switches">
            <label className="portada-switch"><input type="checkbox" checked={job.is_public} disabled={!idle} onChange={() => togglePublished(job)} /><span>Publicado</span></label>
            {job.is_public && <label className="portada-switch"><input type="checkbox" checked={isPinned} disabled={!idle} onChange={() => togglePin(job)} /><span>Fijar arriba</span></label>}
          </div>
        </header>
        <PhotoRow name={job.name} photos={job.photos} interactive={job.is_public} selectedId={sel ? sel.photo.id : null} chipsOf={chipsFor(job)}
          onSelect={(id) => setSelected(id ? { jobId: job.id, photoId: id } : null)} onMove={(from, to) => reorder(job.id, from, to)} />
        {sel && job.is_public && <div className="portada-bar" role="group" aria-label={`Acciones de la foto ${selIndex + 1}`}>
          <p className="portada-bar-title">Foto {selIndex + 1} de {job.photos.length} · {sel.photo.hidden ? "Oculta en el muro" : "Visible en el muro"}</p>
          <div className="portada-bar-buttons">
            <button type="button" className="button secondary" disabled={selIndex <= 0} onClick={() => reorder(job.id, selIndex, selIndex - 1)} aria-label="Mover a la izquierda">← Mover</button>
            <button type="button" className="button secondary" disabled={selIndex >= job.photos.length - 1} onClick={() => reorder(job.id, selIndex, selIndex + 1)} aria-label="Mover a la derecha">Mover →</button>
            <button type="button" className="button secondary" disabled={!idle} onClick={() => toggleHidden(job, sel.photo)}>{sel.photo.hidden ? "Mostrar en el muro" : "Ocultar en el muro"}</button>
            <button type="button" className="button secondary" aria-pressed={mine && draft.beforeId === sel.photo.id} disabled={!idle} onClick={() => pickSlot(job, sel.photo, "before")}>Usar como Antes</button>
            <button type="button" className="button secondary" aria-pressed={mine && draft.afterId === sel.photo.id} disabled={!idle} onClick={() => pickSlot(job, sel.photo, "after")}>Usar como Después</button>
            {mine && draftReady && !unchanged && <button type="button" className="button primary" disabled={!idle} onClick={feature}>Destacar en portada</button>}
          </div>
          {sel.photo.hidden && (draft.beforeId === sel.photo.id || draft.afterId === sel.photo.id) && <p className="field-help">Esta foto no sale en el muro: solo se verá en la portada.</p>}
        </div>}
      </section>;
    })}
    <p className="portada-live" aria-live="polite" role="status">{message}</p>
    <div className="save-feedback">{busy && <p className="save-progress"><span className="spinner" />Guardando…</p>}{!busy && message && <p className="curation-ok">{message}</p>}{error && <p className="alert" role="alert">{error}</p>}</div>
  </div>;
}
