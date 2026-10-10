"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Icon } from "@/components/icon";
import { send } from "./api-client";
import { FocalEditor } from "./focal-editor";
import type { Focal } from "./focal-editor";
import { MAX_DESCRIPTION, MAX_IMAGE_BYTES, parseWorkHours, validateJob } from "./validation";
import { saveDraft } from "./workflow";
import type { DraftPhoto, SaveDraft } from "./workflow";
import type { Job, Media } from "./data";

// Dos paneles (datos y fotografías) y, abajo, la barra de guardado flotante: ocupa el sitio del dock mientras se edita.
export function JobForm({ initial, media = [] }: { initial?: Job; media?: Media[] }) {
  const router = useRouter(); const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [exists, setExists] = useState(!!initial); const [photos, setPhotos] = useState<DraftPhoto[]>(media.map((photo) => ({ id: photo.id, saved: true, url: `/app/api/photos/${photo.id}` })));
  const [removed, setRemoved] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [focals, setFocals] = useState<Record<string, Focal>>(() => Object.fromEntries(media.map((photo) => [photo.id, { x: photo.focal_x, y: photo.focal_y }]))); const [adjusting, setAdjusting] = useState<string>(); const [description, setDescription] = useState(initial?.description ?? ""); const previewUrls = useRef<string[]>([]);
  useEffect(() => () => { previewUrls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const next: DraftPhoto[] = []; const rejected: string[] = [];
    for (const file of Array.from(event.target.files ?? [])) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > MAX_IMAGE_BYTES) { rejected.push(file.name); continue; }
      const url = URL.createObjectURL(file); previewUrls.current.push(url); next.push({ id: crypto.randomUUID(), file, url, saved: false });
    }
    setPhotos((previous) => [...previous, ...next]); setError(rejected.length ? "Algunas fotos no se añadieron. Usa JPEG, PNG o WebP de hasta 10 MB por imagen." : ""); event.target.value = "";
  }
  function removePhoto(photo: DraftPhoto) { setPhotos((previous) => previous.filter((item) => item.id !== photo.id)); if (photo.saved) setRemoved((previous) => [...previous, photo.id]); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget); let job;
    try { job = validateJob({ name: form.get("name"), job_date: form.get("job_date"), paint_code: form.get("paint_code"), work_hours: parseWorkHours(String(form.get("work_hours") ?? "")), description: form.get("description"), is_public: form.get("is_public") === "on" }); }
    catch { setError("Revisa el nombre, la fecha, el código de pintura, las horas (ej. 12,5) y la descripción."); return; }
    setBusy(true); let prepared = false;
    try {
      await saveDraft({ id, exists, job, photos, removed }, {
        prepare: (draft) => send(draft.exists ? `/app/api/jobs/${id}` : "/app/api/jobs", draft.exists ? "PATCH" : "POST", { id, job: draft.job, phase: "prepare" }),
        remove: (jobId, mediaId) => send(`/app/api/jobs/${jobId}/photos/${mediaId}`, "DELETE"),
        upload: (jobId, photo) => { if (!photo.file) throw new Error("Vuelve a seleccionar la fotografía pendiente."); const data = new FormData(); data.set("photo", photo.file); return send(`/app/api/jobs/${jobId}/photos/${photo.id}`, "POST", data); },
        finish: (draft) => send(`/app/api/jobs/${id}`, "PATCH", { phase: "finish", job: draft.job }),
      }, (next: SaveDraft, status) => { prepared = next.prepared === true; setExists(next.exists); setPhotos(next.photos); setRemoved(next.removed); setMessage(status); });
      router.replace(`/app/jobs/${id}`); router.refresh();
    } catch (failure) { setError(`${failure instanceof Error ? failure.message : "No se pudo guardar."}${prepared ? " El trabajo está guardado como privado; conserva el formulario y reintenta para completar los cambios." : " No se confirmó el guardado. Conserva el formulario y reintenta."}`); setBusy(false); }
  }
  const cancel = exists ? `/app/jobs/${id}` : "/app";
  return <form onSubmit={submit} className="job-form"><fieldset disabled={busy} className="form-fields">
    <section className="panel form-data" aria-labelledby="data-title">
      <h2 id="data-title" className="panel-title">Datos</h2>
      <div className="field"><label htmlFor="name">Vehículo o trabajo <span className="req" aria-hidden="true">*</span></label><input id="name" name="name" defaultValue={initial?.name} required maxLength={200} placeholder="Ej. Mercedes Clase E" /></div>
      <div className="field-pair">
        <div className="field"><label htmlFor="job_date">Fecha del trabajo <span className="req" aria-hidden="true">*</span></label><input id="job_date" name="job_date" type="date" required defaultValue={initial?.job_date} min="0001-01-01" max="9999-12-31" /></div>
        <div className="field"><label htmlFor="work_hours">Horas de trabajo</label><div className="unit-input"><input id="work_hours" name="work_hours" inputMode="decimal" autoComplete="off" defaultValue={initial?.work_hours == null ? "" : String(initial.work_hours).replace(".", ",")} maxLength={6} pattern="[0-9]{1,3}([.,][0-9]{1,2})?" title="Horas con hasta dos decimales. Ej. 12,5" placeholder="12,5" aria-describedby="work-hours-help" /><span aria-hidden="true">h</span></div></div>
      </div>
      <p className="field-help field-help-tight" id="work-hours-help">Las horas solo las ves tú; nunca se publican.</p>
      <div className="field"><label htmlFor="paint_code">Código de pintura <span className="optional">Privado</span></label><input id="paint_code" name="paint_code" className="code-input" defaultValue={initial?.paint_code ?? ""} maxLength={80} placeholder="Ej. 197, 300, A89" autoComplete="off" /></div>
      <div className="field"><label htmlFor="description">Descripción <span className="optional">Opcional</span></label><textarea id="description" name="description" rows={4} maxLength={MAX_DESCRIPTION} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Reparación de paragolpes trasero y pintura." aria-describedby="description-help" /><p className="field-help" id="description-help">Se muestra en la web si publicas el trabajo. No incluyas matrículas ni datos personales.{description.length >= 400 && <span className="char-count"> {description.length}/{MAX_DESCRIPTION}</span>}</p></div>
      <label className="publish-control"><input name="is_public" type="checkbox" className="switch" defaultChecked={initial?.is_public ?? false} /><span><strong>Publicar en portfolio</strong><small>Las fotos y la descripción se verán en la web. Revisa matrículas y datos visibles antes de publicar.</small></span></label>
    </section>
    <section className="panel form-photos" aria-labelledby="photos-title">
      <div className="photos-heading"><h2 id="photos-title" className="panel-title">Fotografías</h2><span>{photos.length} {photos.length === 1 ? "foto" : "fotos"}</span></div>
      <p className="field-help field-help-tight">JPEG, PNG o WebP de hasta 10 MB. El orden y lo que sale en el muro se deciden en Portada.</p>
      <div className="photo-previews">{photos.map((photo, index) => <div className={`photo-preview${photo.saved ? "" : " is-new"}`} key={photo.id}><Image unoptimized src={photo.url} width={300} height={375} alt={`Foto ${index + 1}`} style={focals[photo.id] ? { objectPosition: `${focals[photo.id].x}% ${focals[photo.id].y}%` } : undefined} /><span className="photo-position">{index + 1}</span>{!photo.saved && <span className="photo-new">Sin guardar</span>}<button type="button" className="remove-photo" aria-label={`Eliminar foto ${index + 1}`} onClick={() => removePhoto(photo)}><Icon name="close" size={20} /></button>{photo.saved && <button type="button" className="focal-open" aria-label={`Ajustar encuadre de la foto ${index + 1}`} onClick={() => setAdjusting(photo.id)}><Icon name="frame" size={18} />Encuadre</button>}</div>)}<label className="add-photo"><Icon name="upload" size={26} /><span>Añadir fotos</span><small>o suéltalas aquí</small><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} aria-label="Añadir fotografías" /></label></div>
    </section>
  </fieldset>
    <div className="form-dock">
      <div className="save-feedback" aria-live="polite">{busy && <p className="save-progress"><span className="spinner" />{message}</p>}{error && <p className="alert" role="alert"><Icon name="alert" />{error}</p>}</div>
      <div className="form-actions">{!busy && <Link href={cancel} className="button ghost">{exists && error ? "Ver trabajo guardado" : "Cancelar"}</Link>}<button className="button primary" disabled={busy}><Icon name="check" />{busy ? "Guardando…" : "Guardar trabajo"}</button></div>
    </div>
    {adjusting && (() => { const photo = media.find((item) => item.id === adjusting); return photo && initial ? <FocalEditor jobId={initial.id} mediaId={photo.id} initial={focals[photo.id] ?? { x: 50, y: 50 }} width={photo.width} height={photo.height} onClose={() => setAdjusting(undefined)} onSaved={(focal) => setFocals((previous) => ({ ...previous, [photo.id]: focal }))} /> : null; })()}
  </form>;
}
