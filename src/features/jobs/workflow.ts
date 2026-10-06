import type { JobInput } from "./validation";
export type DraftPhoto = { id: string; file?: File; url: string; saved: boolean };
export type SaveDraft = { id: string; exists: boolean; job: JobInput; photos: DraftPhoto[]; removed: string[]; prepared?: boolean };
export type SaveTransport = {
  prepare: (draft: SaveDraft) => Promise<void>;
  remove: (jobId: string, mediaId: string) => Promise<void>;
  upload: (jobId: string, photo: DraftPhoto) => Promise<void>;
  finish: (draft: SaveDraft) => Promise<void>;
};
export async function saveDraft(draft: SaveDraft, transport: SaveTransport, progress: (draft: SaveDraft, message: string) => void): Promise<SaveDraft> {
  let current = { ...draft, photos: [...draft.photos], removed: [...draft.removed], prepared: false };
  progress(current, "Guardando datos…");
  await transport.prepare(current);
  current = { ...current, exists: true, prepared: true }; progress(current, "Datos guardados. Preparando fotografías…");
  for (const id of [...current.removed]) {
    await transport.remove(current.id, id);
    current = { ...current, removed: current.removed.filter((item) => item !== id) }; progress(current, "Fotografía eliminada");
  }
  for (let index = 0; index < current.photos.length; index++) {
    const photo = current.photos[index];
    if (photo.saved) continue;
    progress(current, `Subiendo foto ${index + 1} de ${current.photos.length}…`);
    await transport.upload(current.id, photo);
    current = { ...current, photos: current.photos.map((item) => item.id === photo.id ? { ...item, saved: true } : item) };
    progress(current, `Foto ${index + 1} guardada`);
  }
  await transport.finish(current);
  progress(current, "Trabajo guardado");
  return current;
}
export async function removeMediaSafely(steps: { derivative: () => Promise<void>; original: () => Promise<void>; metadata: () => Promise<void> }): Promise<void> {
  await steps.derivative();
  await steps.original();
  await steps.metadata();
}
