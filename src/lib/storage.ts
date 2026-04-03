import type { AppConfig, Note, NoteId } from '@/types/note';

const KEYS = {
  NOTE_LIST: 'vnotes:note_list',
  NOTE: (id: NoteId) => `vnotes:note:${id}`,
  CONFIG: 'vnotes:config',
} as const;

interface NoteListMeta {
  ids: NoteId[];
  idToUpdatedAt: Record<NoteId, number>;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getNoteListMeta(store: Storage): NoteListMeta {
  return safeParseJSON<NoteListMeta>(store.getItem(KEYS.NOTE_LIST)) ?? {
    ids: [],
    idToUpdatedAt: {},
  };
}

function setNoteListMeta(store: Storage, meta: NoteListMeta): void {
  store.setItem(KEYS.NOTE_LIST, JSON.stringify(meta));
}

function sortedIds(meta: NoteListMeta): NoteId[] {
  return [...meta.ids].sort(
    (a, b) => (meta.idToUpdatedAt[b] ?? 0) - (meta.idToUpdatedAt[a] ?? 0)
  );
}

export function getAllNoteIds(store: Storage = localStorage): NoteId[] {
  return sortedIds(getNoteListMeta(store));
}

export function getNote(id: NoteId, store: Storage = localStorage): Note | null {
  return safeParseJSON<Note>(store.getItem(KEYS.NOTE(id)));
}

export function getAllNotes(store: Storage = localStorage): Note[] {
  const ids = getAllNoteIds(store);
  return ids
    .map((id) => getNote(id, store))
    .filter((note): note is Note => note !== null);
}

export function saveNote(note: Note, store: Storage = localStorage): void {
  const meta = getNoteListMeta(store);
  const isNew = !meta.ids.includes(note.id);

  store.setItem(KEYS.NOTE(note.id), JSON.stringify(note));

  if (isNew) meta.ids.push(note.id);
  meta.idToUpdatedAt[note.id] = note.updatedAt;
  try {
    setNoteListMeta(store, meta);
  } catch (e) {
    // If the index write fails for a new note, remove the orphaned body
    if (isNew) store.removeItem(KEYS.NOTE(note.id));
    throw e;
  }
}

export function deleteNote(id: NoteId, store: Storage = localStorage): void {
  store.removeItem(KEYS.NOTE(id));

  const meta = getNoteListMeta(store);
  meta.ids = meta.ids.filter((existingId) => existingId !== id);
  delete meta.idToUpdatedAt[id];
  setNoteListMeta(store, meta);
}

const DEFAULT_CONFIG: AppConfig = {
  autoSaveStrategy: 'debounced',
  autoSaveDelayMs: 1000,
};

export function getConfig(store: Storage = localStorage): AppConfig {
  return safeParseJSON<AppConfig>(store.getItem(KEYS.CONFIG)) ?? DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig, store: Storage = localStorage): void {
  store.setItem(KEYS.CONFIG, JSON.stringify(config));
}

export function clearAll(store: Storage = localStorage): void {
  const meta = getNoteListMeta(store);
  meta.ids.forEach((id) => store.removeItem(KEYS.NOTE(id)));
  store.removeItem(KEYS.NOTE_LIST);
  store.removeItem(KEYS.CONFIG);
}
