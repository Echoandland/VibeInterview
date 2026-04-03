import { useEffect } from 'react';
import { useNoteStore } from '@/store/noteStore';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import type { NoteId } from '@/types/note';

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved';

export function useAutoSave(noteId: NoteId | null): {
  saveStatus: SaveStatus;
  forceSave: () => void;
} {
  const isDirty = useNoteStore((s) => s.isDirty);
  const isSaving = useNoteStore((s) => s.isSaving);
  const lastSavedAt = useNoteStore((s) => s.lastSavedAt);
  const autoSaveStrategy = useNoteStore((s) => s.config.autoSaveStrategy);
  const autoSaveDelayMs = useNoteStore((s) => s.config.autoSaveDelayMs);
  const saveNote = useNoteStore((s) => s.saveNote);

  const [debouncedSave, cancelSave] = useDebouncedCallback(
    (id: NoteId) => saveNote(id),
    autoSaveDelayMs
  );

  // Trigger auto-save when content changes (debounced strategy only)
  useEffect(() => {
    if (!noteId || !isDirty || autoSaveStrategy !== 'debounced') return;
    debouncedSave(noteId);
    return () => cancelSave();
  }, [isDirty, noteId, autoSaveStrategy, debouncedSave, cancelSave]);

  const forceSave = () => {
    cancelSave();
    if (noteId) saveNote(noteId);
  };

  let saveStatus: SaveStatus = 'idle';
  if (isSaving) {
    saveStatus = 'saving';
  } else if (isDirty) {
    saveStatus = 'unsaved';
  } else if (lastSavedAt !== null) {
    saveStatus = 'saved';
  }

  return { saveStatus, forceSave };
}
