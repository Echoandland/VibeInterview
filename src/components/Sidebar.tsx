import { useNoteStore } from '@/store/noteStore';

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86_400_000;

  if (timestamp >= startOfToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (timestamp >= startOfYesterday) {
    return 'Yesterday';
  }
  if (now.getTime() - timestamp < 7 * 86_400_000) {
    return date.toLocaleDateString([], { weekday: 'long' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function Sidebar() {
  const notes = useNoteStore((s) => s.notes);
  const searchQuery = useNoteStore((s) => s.searchQuery);
  const searchResults = useNoteStore((s) => s.searchResults);
  const activeNoteId = useNoteStore((s) => s.activeNoteId);
  const createNote = useNoteStore((s) => s.createNote);
  const setActiveNote = useNoteStore((s) => s.setActiveNote);
  const setSearchQuery = useNoteStore((s) => s.setSearchQuery);

  const isSearching = searchQuery.term.trim().length > 0;
  const displayIds = isSearching
    ? searchResults.map((r) => r.noteId)
    : notes.ids;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Notes</span>
        <button className="btn-new" onClick={() => createNote()} title="New note">
          +
        </button>
      </div>

      <div className="sidebar-search">
        <input
          type="search"
          className="search-input"
          placeholder="Search…"
          value={searchQuery.term}
          onChange={(e) => setSearchQuery({ term: e.target.value })}
        />
      </div>

      <ul className="note-list" role="listbox" aria-label="Notes">
        {displayIds.length === 0 && (
          <li className="note-list-empty">
            {isSearching ? 'No results' : 'No notes yet'}
          </li>
        )}
        {displayIds.map((id) => {
          const note = notes.entities[id];
          if (!note) return null;
          const isActive = id === activeNoteId;
          return (
            <li
              key={id}
              role="option"
              aria-selected={isActive}
              className={`note-item${isActive ? ' note-item--active' : ''}`}
              onClick={() => setActiveNote(id)}
            >
              <span className="note-item-title">{note.title}</span>
              <span className="note-item-date">{formatDate(note.updatedAt)}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
