import { useEffect } from 'react';
import { useNoteStore } from '@/store/noteStore';
import Sidebar from '@/components/Sidebar';
import Editor from '@/components/Editor';
import Preview from '@/components/Preview';
import './App.css';

export default function App() {
  const initialize = useNoteStore((s) => s.initialize);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const createNote = useNoteStore((s) => s.createNote);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="app">
      <Sidebar />
      {activeNoteId ? (
        <>
          <Editor noteId={activeNoteId} />
          <Preview noteId={activeNoteId} />
        </>
      ) : (
        <div className="app-empty">
          <p>No note selected</p>
          <button onClick={() => createNote()}>New note</button>
        </div>
      )}
    </div>
  );
}
