import ReactMarkdown from 'react-markdown';
import { REMARK_PLUGINS, MARKDOWN_COMPONENTS } from '@/lib/markdown.tsx';
import { useNoteStore } from '@/store/noteStore';
import type { NoteId } from '@/types/note';

interface Props {
  noteId: NoteId;
}

export default function Preview({ noteId }: Props) {
  const content = useNoteStore((s) => s.notes.entities[noteId]?.content ?? '');

  return (
    <div className="preview-pane">
      <div className="preview-label">Preview</div>
      <div className="preview-scroll">
        {content.trim() ? (
          <div className="md-content">
            <ReactMarkdown
              remarkPlugins={REMARK_PLUGINS}
              components={MARKDOWN_COMPONENTS}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="preview-empty">Preview will appear here…</p>
        )}
      </div>
    </div>
  );
}
