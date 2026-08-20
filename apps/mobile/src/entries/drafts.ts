import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProcessedPhoto } from '../photos/processPhoto';

// Draft retention (#14): a failed or offline save keeps the full Entry —
// including the processed photos' cache-dir URIs — in AsyncStorage until a
// retry lands. The store is one flat list rather than one slot per date:
// two failed saves on the same day must both survive. It is versioned like
// the content blob; an unreadable or future-versioned store reads as empty
// instead of crashing the day view.
const STORAGE_KEY = 'entryDrafts.v1';

export type EntryDraft = {
  id: string;
  /** The day the Entry belongs to, YYYY-MM-DD. */
  date: string;
  /** Set once the Entry exists server-side, so a retry updates instead of duplicating. */
  entryId?: string;
  categoryId: string;
  subcategoryId?: string;
  /** The encoded content blob, exactly as it would travel on the wire. */
  content: string;
  /** Staged photos' local copies. The OS may purge these cache files; restore tolerates it. */
  photos: ProcessedPhoto[];
  savedAt: string;
};

type Store = { v: 1; drafts: EntryDraft[] };

async function readAll(): Promise<EntryDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as Store;
    if (parsed.v !== 1 || !Array.isArray(parsed.drafts)) return [];
    return parsed.drafts;
  } catch {
    return [];
  }
}

async function writeAll(drafts: EntryDraft[]): Promise<void> {
  const store: Store = { v: 1, drafts };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function newDraftId(): string {
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Drafts for one day, oldest failure first. */
export async function listDrafts(date: string): Promise<EntryDraft[]> {
  return (await readAll()).filter((draft) => draft.date === date);
}

/** Upsert by id: a retried failure refreshes its draft in place. */
export async function saveDraft(draft: EntryDraft): Promise<void> {
  try {
    const all = await readAll();
    const index = all.findIndex((d) => d.id === draft.id);
    await writeAll(index === -1 ? [...all, draft] : all.map((d, i) => (i === index ? draft : d)));
  } catch {
    // Storage refused the write; the form still holds everything in memory.
  }
}

export async function clearDraft(id: string): Promise<void> {
  try {
    const all = await readAll();
    if (all.some((d) => d.id === id)) {
      await writeAll(all.filter((d) => d.id !== id));
    }
  } catch {
    // A draft that would not clear resurfaces once more and clears on the next success.
  }
}
