import { useEffect, useRef } from 'react';
import { useNoteStore } from '@/store/noteStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { NoteId } from '@/types/note';

interface Props {
  noteId: NoteId;
}

const SAVE_STATUS_LABEL: Record<string, string> = {
  idle: '',
  unsaved: 'Unsaved',
  saving: 'Saving…',
  saved: 'Saved',
};

export default function Editor({ noteId }: Props) {
  const note = useNoteStore((s) => s.notes.entities[noteId]);
  const updateNoteContent = useNoteStore((s) => s.updateNoteContent);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const { saveStatus, forceSave } = useAutoSave(noteId);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when switching to a different note
  useEffect(() => {
    textareaRef.current?.focus();
  }, [noteId]);

  if (!note) return null;

  return (
    <div className="editor-pane">
      <div className="editor-toolbar">
        <span className="editor-toolbar-title">{note.title}</span>

        <span className={`save-status save-status--${saveStatus}`} aria-live="polite">
          {SAVE_STATUS_LABEL[saveStatus]}
        </span>

        <button
          className="btn-toolbar btn-save"
          onClick={forceSave}
          title="Save (forces immediate save)"
        >
          Save
        </button>

        <button
          className="btn-toolbar btn-delete"
          onClick={() => deleteNote(noteId)}
          title="Delete note"
        >
          Delete
        </button>
      </div>

      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={note.content}
        onChange={(e) => updateNoteContent(noteId, e.target.value)}
        placeholder="Start writing in Markdown…"
        spellCheck={false}
        aria-label="Note editor"
      />
    </div>
  );
}
