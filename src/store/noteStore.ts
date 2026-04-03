import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import type { AppConfig, AppState, NoteId, SearchQuery } from '@/types/note';
import * as storage from '@/lib/storage';
import { deriveTitle, searchNotes } from '@/lib/search';

interface NoteStore extends AppState {
  config: AppConfig;

  // Initialization
  initialize(): void;

  // Note CRUD
  createNote(): NoteId;
  updateNoteContent(id: NoteId, content: string): void;
  saveNote(id: NoteId): void;
  deleteNote(id: NoteId): void;
  setActiveNote(id: NoteId | null): void;

  // Search
  setSearchQuery(patch: Partial<SearchQuery>): void;

  // Config
  updateConfig(patch: Partial<AppConfig>): void;
}

const DEFAULT_CONFIG: AppConfig = {
  autoSaveStrategy: 'debounced',
  autoSaveDelayMs: 1000,
};

export const useNoteStore = create<NoteStore>()(
  immer(
    devtools(
      (set, get) => ({
        // Initial AppState
        notes: { ids: [], entities: {} },
        activeNoteId: null,
        searchQuery: { term: '', fields: ['title', 'content'] },
        searchResults: [],
        isDirty: false,
        isSaving: false,
        lastSavedAt: null,
        config: DEFAULT_CONFIG,

        initialize() {
          const allNotes = storage.getAllNotes();
          const config = storage.getConfig();
          set((state) => {
            state.notes.entities = {};
            state.notes.ids = [];
            for (const note of allNotes) {
              state.notes.entities[note.id] = note;
              state.notes.ids.push(note.id);
            }
            state.config = config;
          });
        },

        createNote() {
          const id = crypto.randomUUID();
          const now = Date.now();
          const note = {
            id,
            title: 'Untitled',
            content: '',
            createdAt: now,
            updatedAt: now,
            isPinned: false,
          };
          storage.saveNote(note);
          set((state) => {
            state.notes.entities[id] = note;
            state.notes.ids.unshift(id); // newest first
            state.activeNoteId = id;
            state.isDirty = false;
          });
          return id;
        },

        updateNoteContent(id, content) {
          const title = deriveTitle(content);
          set((state) => {
            const note = state.notes.entities[id];
            if (!note) return;
            note.content = content;
            note.title = title;
            state.isDirty = true;
          });
        },

        saveNote(id) {
          const note = get().notes.entities[id];
          if (!note) return;

          const updatedNote = { ...note, updatedAt: Date.now() };

          set((draft) => { draft.isSaving = true; });

          storage.saveNote(updatedNote);

          set((draft) => {
            draft.notes.entities[id] = updatedNote;
            // Move to front of list (most recently updated)
            draft.notes.ids = [id, ...draft.notes.ids.filter((i) => i !== id)];
            draft.isDirty = false;
            draft.isSaving = false;
            draft.lastSavedAt = updatedNote.updatedAt;
          });
        },

        deleteNote(id) {
          storage.deleteNote(id);
          set((state) => {
            delete state.notes.entities[id];
            state.notes.ids = state.notes.ids.filter((i) => i !== id);
            if (state.activeNoteId === id) {
              state.activeNoteId = state.notes.ids[0] ?? null;
              state.isDirty = false;
            }
          });
        },

        setActiveNote(id) {
          set((state) => {
            state.activeNoteId = id;
            state.isDirty = false;
          });
        },

        setSearchQuery(patch) {
          set((state) => {
            Object.assign(state.searchQuery, patch);
            const allNotes = Object.values(state.notes.entities);
            state.searchResults = searchNotes(allNotes, state.searchQuery);
          });
        },

        updateConfig(patch) {
          set((state) => {
            Object.assign(state.config, patch);
            storage.saveConfig({ ...state.config });
          });
        },
      }),
      { name: 'NoteStore' }
    )
  )
);
