export type NoteId = string;

export interface Note {
  id: NoteId;
  title: string; // derived from first line of content
  content: string; // raw Markdown
  createdAt: number; // Date.now()
  updatedAt: number; // sort key
  isPinned: boolean;
}

export interface NoteList {
  ids: NoteId[]; // sorted: pinned first, then updatedAt desc
  entities: Record<NoteId, Note>; // O(1) lookup
}

export interface SearchQuery {
  term: string;
  fields: ('title' | 'content')[];
}

export interface SearchResult {
  noteId: NoteId;
  matchedIn: ('title' | 'content')[];
  score: number;
}

export interface AppState {
  notes: NoteList;
  activeNoteId: NoteId | null;
  searchQuery: SearchQuery;
  searchResults: SearchResult[];
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
}

export interface AppConfig {
  autoSaveStrategy: 'debounced' | 'explicit';
  autoSaveDelayMs: number; // default 1000
}
