"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Icon } from "@/components/icon";
import { MAX_IMAGE_BYTES, validateJob } from "./validation";
import { saveDraft } from "./workflow";
import type { DraftPhoto, SaveDraft } from "./workflow";
import type { Job, Media } from "./data";

async function send(url: string, method: string, body?: unknown) {
  let response;
  try { response = await fetch(url, { method, ...(body instanceof FormData ? { body } : body ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}) }); }
  catch { throw new Error("No hay conexión. Conserva el formulario y reintenta."); }
  let result: { error?: string }; try { result = await response.json(); } catch { throw new Error("La sesión ha terminado o no hay conexión. Reintenta."); }
  if (!response.ok) throw new Error(result.error || "No se pudo completar la operación");
}
export function JobForm({ initial, media = [] }: { initial?: Job; media?: Media[] }) {
  const router = useRouter(); const [id] = useState(() => initial?.id ?? crypto.randomUUID());
  const [exists, setExists] = useState(!!initial); const [photos, setPhotos] = useState<DraftPhoto[]>(media.map((photo) => ({ id: photo.id, saved: true, url: `/app/api/photos/${photo.id}` })));
  const [removed, setRemoved] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const previewUrls = useRef<string[]>([]);
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
    try { job = validateJob({ name: form.get("name"), job_date: form.get("job_date"), paint_code: form.get("paint_code"), is_public: form.get("is_public") === "on" }); }
    catch { setError("Revisa el nombre, la fecha y el código de pintura."); return; }
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
  return <form onSubmit={submit} className="job-form"><fieldset disabled={busy} className="form-fields"><div className="form-data"><div className="field"><label htmlFor="name">Vehículo o trabajo <span aria-hidden="true">*</span></label><input id="name" name="name" defaultValue={initial?.name} required maxLength={200} placeholder="Ej. Mercedes Clase E" /></div><div className="field"><label htmlFor="job_date">Fecha del trabajo <span aria-hidden="true">*</span></label><input id="job_date" name="job_date" type="date" required defaultValue={initial?.job_date} min="0001-01-01" max="9999-12-31" /></div><div className="field"><label htmlFor="paint_code">Código de pintura <span className="optional">Opcional</span></label><input id="paint_code" name="paint_code" defaultValue={initial?.paint_code ?? ""} maxLength={80} placeholder="Ej. 197, 300, A89" /></div><label className="publish-control"><input name="is_public" type="checkbox" defaultChecked={initial?.is_public ?? false} /><span><strong>Publicar en portfolio</strong><small>Las fotos serán públicas. Revisa matrículas y datos visibles antes de publicar.</small></span></label></div>
    <section className="form-photos" aria-labelledby="photos-title"><div className="photos-heading"><h2 id="photos-title">Fotografías</h2><span className="muted">{photos.length} {photos.length === 1 ? "foto" : "fotos"}</span></div><p className="field-help">JPEG, PNG o WebP · Hasta 10 MB por foto</p><div className="photo-previews">{photos.map((photo, index) => <div className="photo-preview" key={photo.id}><Image unoptimized src={photo.url} width={300} height={300} alt={`Foto ${index + 1}`} /><button type="button" className="remove-photo" aria-label={`Eliminar foto ${index + 1}`} onClick={() => removePhoto(photo)}><Icon name="close" /></button><span className="photo-position">{index + 1}</span></div>)}<label className="add-photo"><Icon name="plus" /><span>Añadir fotos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={selectPhotos} aria-label="Añadir fotografías" /></label></div></section></fieldset>
    <div className="save-feedback" aria-live="polite">{busy && <p className="save-progress"><span className="spinner" />{message}</p>}{error && <p className="alert" role="alert">{error}</p>}</div><div className="form-actions">{!busy && <Link href={cancel} className="button secondary">{exists && error ? "Ver trabajo guardado" : "Cancelar"}</Link>}<button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar trabajo"}<Icon name="arrow" style={{ transform: "rotate(180deg)" }} /></button></div>
  </form>;
}
