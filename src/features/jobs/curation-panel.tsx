"use client";
import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { send } from "./api-client";
import { focalStyle } from "./focal";
import type { Media } from "./data";
import type { CurationState } from "./curation";

type Slot = "before" | "after";
type Pair = { before: string | null; after: string | null };
const LABEL: Record<Slot, string> = { before: "Antes", after: "Después" };

function Thumb({ photo, index }: { photo: Media; index: number }) {
  return <Image unoptimized src={`/app/api/photos/${photo.id}`} width={240} height={240} alt={`Foto ${index + 1}`} style={focalStyle(photo)} />;
}

// Selector de foto para Antes/Después: diálogo nativo (foco atrapado, Escape cierra) con las fotos del trabajo.
// Quien lo usa lo desmonta al elegir o cancelar (el cleanup cierra el diálogo): no se depende del evento `close` salvo para Escape.
function PhotoPicker({ slot, media, hidden, taken, onPick, onClose }: { slot: Slot; media: Media[]; hidden: ReadonlySet<string>; taken: string | null; onPick: (id: string) => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={dialog} className="picker-dialog" aria-labelledby="picker-title" onClose={(event) => { if (!event.currentTarget.open) onClose(); }}>
    <h2 id="picker-title">Foto del «{LABEL[slot]}»</h2>
    <p className="field-help">Toca la foto que muestra el trabajo {slot === "before" ? "antes de la reparación" : "terminado"}.</p>
    <div className="picker-grid">{media.map((photo, index) => {
      const unavailable = hidden.has(photo.id) || photo.id === taken;
      return <button key={photo.id} type="button" className="picker-photo" disabled={unavailable} onClick={() => onPick(photo.id)} aria-label={`Foto ${index + 1}${hidden.has(photo.id) ? " (oculta en la web)" : photo.id === taken ? ` (ya es el ${slot === "before" ? "después" : "antes"})` : ""}`}>
        <Thumb photo={photo} index={index} />{unavailable && <span className="picker-note">{hidden.has(photo.id) ? "Oculta" : "En uso"}</span>}
      </button>;
    })}</div>
    <div className="picker-actions"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button></div>
  </dialog>;
}

// Portada y muro de la home pública: trabajo fijado, transformación Antes/Después y fotos visibles.
// Cada cambio se guarda al momento (no depende del formulario de edición, que despublica mientras guarda).
export function CurationPanel({ jobId, isPublic, media, state }: { jobId: string; isPublic: boolean; media: Media[]; state: CurationState }) {
  const initialPair: Pair | null = state.featured?.beforeId && state.featured.afterId ? { before: state.featured.beforeId, after: state.featured.afterId } : null;
  const [pinned, setPinned] = useState(state.pinned);
  const [saved, setSaved] = useState<Pair | null>(initialPair);
  const [draft, setDraft] = useState<Pair>(initialPair ?? { before: null, after: null });
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set(media.filter((photo) => photo.hidden_from_home).map((photo) => photo.id)));
  const [picking, setPicking] = useState<Slot | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(key: string, action: () => Promise<void>, done: () => void) {
    setBusy(key); setError(""); setMessage("");
    try { await action(); done(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar. Reintenta."); }
    finally { setBusy(null); }
  }
  const idle = busy === null;
  const photoNumber = (id: string | null) => media.findIndex((photo) => photo.id === id);
  const photoOf = (id: string | null) => media.find((photo) => photo.id === id);
  const locked = (id: string) => saved?.before === id || saved?.after === id;
  const unchanged = !!saved && draft.before === saved.before && draft.after === saved.after;
  const ready = !!draft.before && !!draft.after && !unchanged;

  const togglePin = () => run("pin", () => send("/app/api/portfolio", "PATCH", { pinned_job_id: pinned ? null : jobId }), () => { setPinned(!pinned); setMessage(pinned ? "Ya no está fijado arriba." : "Fijado arriba del muro."); });
  const feature = () => run("feature", () => send("/app/api/portfolio", "PATCH", { featured: { job_id: jobId, before_id: draft.before, after_id: draft.after } }), () => { setSaved(draft); setMessage("Transformación destacada en la portada."); });
  const unfeature = () => run("feature", () => send("/app/api/portfolio", "PATCH", { featured: null }), () => { setSaved(null); setDraft({ before: null, after: null }); setMessage("La portada vuelve al título solo."); });
  const toggleHidden = (id: string) => {
    const hide = !hidden.has(id);
    return run(`hide:${id}`, () => send(`/app/api/jobs/${jobId}/photos/${id}`, "PATCH", { hidden: hide }), () => {
      setHidden((current) => { const next = new Set(current); if (hide) next.add(id); else next.delete(id); return next; });
      if (hide) setDraft((current) => ({ before: current.before === id ? null : current.before, after: current.after === id ? null : current.after }));
      setMessage(hide ? "Foto oculta en la web." : "Foto visible en la web.");
    });
  };

  const featuredStatus = saved ? (isPublic ? "En portada ahora mismo." : "Inactiva: el trabajo está privado. Volverá a mostrarse al publicarlo.")
    : state.otherFeaturedName ? `Al destacarla sustituirás la transformación de «${state.otherFeaturedName}».` : "Elige la foto del antes y la del después.";
  const visibleCount = media.filter((photo) => !hidden.has(photo.id)).length;

  return <section className="curation" aria-labelledby="curation-title">
    <div className="curation-head"><h2 id="curation-title">Portada y muro</h2><p className="muted">Decide qué se ve en la página de inicio. Los cambios se guardan al momento.</p></div>
    {!isPublic && <p className="field-help curation-private">Publica el trabajo para fijarlo o destacarlo. Puedes ocultar fotos desde ya.</p>}
    <div className="curation-blocks">
      <div className="curation-block">
        <h3>Fijar arriba del muro</h3>
        <label className="publish-control"><input type="checkbox" checked={pinned} disabled={!idle || !isPublic} onChange={togglePin} /><span><strong>Mostrar este trabajo el primero</strong><small>{pinned ? "Está fijado: aparece el primero en la página de inicio." : state.otherPinnedName ? `Ahora está fijado «${state.otherPinnedName}»; este lo sustituirá.` : "Solo puede haber uno fijado."}</small></span></label>
      </div>
      <div className="curation-block">
        <h3>Transformación en portada</h3>
        <div className="curation-slots" role="group" aria-label="Antes y después de la portada">
          {(["before", "after"] as const).map((slot) => {
            const photo = photoOf(draft[slot]);
            return <button key={slot} type="button" className="curation-slot" disabled={!idle || !isPublic || media.length < 2} onClick={() => setPicking(slot)} aria-haspopup="dialog" aria-label={`${LABEL[slot]}: ${photo ? `foto ${photoNumber(photo.id) + 1}` : "elegir foto"}`}>
              {photo ? <Thumb photo={photo} index={photoNumber(photo.id)} /> : <span className="slot-empty">Elegir foto</span>}
              <span className="slot-label">{LABEL[slot]}</span>
            </button>;
          })}
        </div>
        <p className="field-help" aria-live="polite">{media.length < 2 ? "Necesitas al menos dos fotos para una transformación." : featuredStatus}</p>
        <div className="curation-actions">
          <button type="button" className="button primary" disabled={!idle || !isPublic || !ready} onClick={feature}>{busy === "feature" ? "Guardando…" : saved ? "Actualizar portada" : "Destacar en portada"}</button>
          {saved && <button type="button" className="button secondary" disabled={!idle} onClick={unfeature}>Quitar de portada</button>}
        </div>
      </div>
      <div className="curation-block curation-wide">
        <h3>Fotos en la web <span className="muted">· {visibleCount} de {media.length} visibles</span></h3>
        {media.length ? <ul className="curation-photos">{media.map((photo, index) => {
          const isHidden = hidden.has(photo.id), inCover = locked(photo.id);
          return <li key={photo.id} className={isHidden ? "is-hidden" : undefined}>
            <button type="button" className="curation-photo" aria-pressed={!isHidden} disabled={!idle || inCover} onClick={() => toggleHidden(photo.id)} aria-label={`Foto ${index + 1}: ${inCover ? "en la portada" : isHidden ? "oculta en la web. Tocar para mostrar" : "visible en la web. Tocar para ocultar"}`}>
              <Thumb photo={photo} index={index} />
              <span className="photo-state">{inCover ? "En portada" : isHidden ? "Oculta" : "Visible"}</span>
            </button>
          </li>;
        })}</ul> : <p className="field-help">Este trabajo no tiene fotografías.</p>}
        <p className="field-help">Las fotos ocultas no aparecen en la web ni se pueden descargar públicamente. Tú las sigues viendo aquí.</p>
      </div>
    </div>
    <div className="save-feedback" aria-live="polite">{busy && <p className="save-progress"><span className="spinner" />Guardando…</p>}{!busy && message && <p className="curation-ok">{message}</p>}{error && <p className="alert" role="alert">{error}</p>}</div>
    {picking && <PhotoPicker key={picking} slot={picking} media={media} hidden={hidden} taken={picking === "before" ? draft.after : draft.before} onPick={(id) => { setDraft((current) => ({ ...current, [picking]: id })); setPicking(null); }} onClose={() => setPicking(null)} />}
  </section>;
}
