import type { ProcessedPhoto } from '../photos/processPhoto';
import { versionedStore } from '../storage/versionedStore';

// Draft retention (#14): a failed or offline save keeps the full Entry —
// including the processed photos' cache-dir URIs — in AsyncStorage until a
// retry lands. The store is one flat list rather than one slot per date:
// two failed saves on the same day must both survive. Persistence rides
// the shared versioned envelope (storage/versionedStore); an unreadable or
// future-versioned store reads as empty instead of crashing the day view.

export type EntryDraft = {
  id: string;
  /** The day the Entry belongs to, YYYY-MM-DD. */
  date: string;
  /** Set once the Entry exists server-side, so a retry updates instead of duplicating. */
  entryId?: string;
  categoryId: string;
  subcategoryId?: string;
  /** A typed-but-uncreated subcategory (#28): the retry creates it at save. */
  pendingSubcategoryName?: string;
  /** The encoded content blob, exactly as it would travel on the wire. */
  content: string;
  /** Staged photos' local copies. The OS may purge these cache files; restore tolerates it. */
  photos: ProcessedPhoto[];
  savedAt: string;
};

type Store = { v: 1; drafts: EntryDraft[] };

const store = versionedStore<EntryDraft[]>({
  key: 'entryDrafts.v1',
  fallback: [],
  decode: (envelope) => {
    const parsed = envelope as Store;
    return parsed.v === 1 && Array.isArray(parsed.drafts) ? parsed.drafts : null;
  },
  encode: (drafts): Store => ({ v: 1, drafts }),
});

export function newDraftId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Drafts for one day, oldest failure first. */
export async function listDrafts(date: string): Promise<EntryDraft[]> {
  return (await store.load()).filter((draft) => draft.date === date);
}

/** Upsert by id: a retried failure refreshes its draft in place. A refused
 * write is swallowed by the store; the form still holds everything in memory. */
export async function saveDraft(draft: EntryDraft): Promise<void> {
  const all = await store.load();
  const index = all.findIndex((d) => d.id === draft.id);
  await store.save(index === -1 ? [...all, draft] : all.map((d, i) => (i === index ? draft : d)));
}

/** A draft that would not clear resurfaces once more and clears on the next success. */
export async function clearDraft(id: string): Promise<void> {
  const all = await store.load();
  if (all.some((d) => d.id === id)) {
    await store.save(all.filter((d) => d.id !== id));
  }
}
