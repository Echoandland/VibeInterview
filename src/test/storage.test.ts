import { describe, it, expect, beforeEach } from 'vitest';
import { clearAll, deleteNote, getAllNoteIds, getAllNotes, getConfig, getNote, saveConfig, saveNote } from '@/lib/storage';
import type { Note } from '@/types/note';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'test-id-1',
    title: 'Test Note',
    content: '# Test Note\nSome content',
    createdAt: 1000,
    updatedAt: 1000,
    isPinned: false,
    ...overrides,
  };
}

class MemoryStorage implements Storage {
  private data: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.data).length;
  }

  key(index: number): string | null {
    return Object.keys(this.data)[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

let store: MemoryStorage;

beforeEach(() => {
  store = new MemoryStorage();
});

// ─── saveNote / getNote ───────────────────────────────────────────────────────

describe('saveNote / getNote', () => {
  it('saves and retrieves a note', () => {
    const note = makeNote();
    saveNote(note, store);
    expect(getNote(note.id, store)).toEqual(note);
  });

  it('returns null for unknown id', () => {
    expect(getNote('nonexistent', store)).toBeNull();
  });

  it('overwrites an existing note', () => {
    const note = makeNote();
    saveNote(note, store);
    const updated = { ...note, title: 'Updated', updatedAt: 2000 };
    saveNote(updated, store);
    expect(getNote(note.id, store)?.title).toBe('Updated');
  });

  it('preserves all note fields through a round-trip', () => {
    const note = makeNote({
      id: 'rt-1',
      title: 'Round Trip',
      content: '# Heading\n**bold** _italic_\n- item',
      createdAt: 111,
      updatedAt: 222,
      isPinned: true,
    });
    saveNote(note, store);
    expect(getNote(note.id, store)).toEqual(note);
  });

  it('preserves note content with special characters', () => {
    const note = makeNote({
      id: 'special',
      content: '```js\nconsole.log("hello & <world>");\n```\nUnicode: 日本語 😀',
    });
    saveNote(note, store);
    expect(getNote(note.id, store)?.content).toBe(note.content);
  });

  it('preserves multiline markdown content exactly', () => {
    const content = '# Title\n\n## Section\n\n- item 1\n- item 2\n\n**bold** and *italic*\n\n[link](https://example.com)';
    const note = makeNote({ id: 'md-1', content });
    saveNote(note, store);
    expect(getNote(note.id, store)?.content).toBe(content);
  });
});

// ─── getAllNoteIds ────────────────────────────────────────────────────────────

describe('getAllNoteIds', () => {
  it('returns empty array when no notes', () => {
    expect(getAllNoteIds(store)).toEqual([]);
  });

  it('returns ids sorted by updatedAt descending', () => {
    const older = makeNote({ id: 'a', updatedAt: 1000 });
    const newer = makeNote({ id: 'b', updatedAt: 2000 });
    saveNote(older, store);
    saveNote(newer, store);
    expect(getAllNoteIds(store)).toEqual(['b', 'a']);
  });

  it('does not duplicate ids on re-save', () => {
    const note = makeNote();
    saveNote(note, store);
    saveNote({ ...note, updatedAt: 2000 }, store);
    expect(getAllNoteIds(store)).toHaveLength(1);
  });

  it('re-saves update the sort position', () => {
    const a = makeNote({ id: 'a', updatedAt: 100 });
    const b = makeNote({ id: 'b', updatedAt: 200 });
    saveNote(a, store);
    saveNote(b, store);
    // Re-save 'a' with a newer timestamp — it should move to front
    saveNote({ ...a, updatedAt: 300 }, store);
    expect(getAllNoteIds(store)[0]).toBe('a');
  });

  it('handles three notes in correct order', () => {
    saveNote(makeNote({ id: 'x', updatedAt: 100 }), store);
    saveNote(makeNote({ id: 'y', updatedAt: 300 }), store);
    saveNote(makeNote({ id: 'z', updatedAt: 200 }), store);
    expect(getAllNoteIds(store)).toEqual(['y', 'z', 'x']);
  });
});

// ─── getAllNotes ──────────────────────────────────────────────────────────────

describe('getAllNotes', () => {
  it('returns empty array when no notes', () => {
    expect(getAllNotes(store)).toEqual([]);
  });

  it('returns all notes sorted by updatedAt desc', () => {
    const a = makeNote({ id: 'a', updatedAt: 100 });
    const b = makeNote({ id: 'b', updatedAt: 200 });
    saveNote(a, store);
    saveNote(b, store);
    const notes = getAllNotes(store);
    expect(notes[0].id).toBe('b');
    expect(notes[1].id).toBe('a');
  });

  it('skips corrupted note entries', () => {
    const note = makeNote({ id: 'good' });
    saveNote(note, store);
    store.setItem('vnotes:note:bad', '{invalid json}');
    const meta = JSON.parse(store.getItem('vnotes:note_list')!);
    meta.ids.push('bad');
    meta.idToUpdatedAt['bad'] = 999;
    store.setItem('vnotes:note_list', JSON.stringify(meta));

    const notes = getAllNotes(store);
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('good');
  });

  it('round-trip: all saved notes are returned with full data intact', () => {
    const a = makeNote({ id: 'a', title: 'Alpha', content: '# Alpha\nbody', updatedAt: 100 });
    const b = makeNote({ id: 'b', title: 'Beta', content: '**bold**', updatedAt: 200, isPinned: true });
    saveNote(a, store);
    saveNote(b, store);
    const notes = getAllNotes(store);
    const returned_a = notes.find((n) => n.id === 'a')!;
    const returned_b = notes.find((n) => n.id === 'b')!;
    expect(returned_a).toEqual(a);
    expect(returned_b).toEqual(b);
  });

  it('reflects updates: modified note appears with new data', () => {
    const note = makeNote({ id: 'x', title: 'Old Title', updatedAt: 100 });
    saveNote(note, store);
    saveNote({ ...note, title: 'New Title', updatedAt: 200 }, store);
    const notes = getAllNotes(store);
    expect(notes).toHaveLength(1);
    expect(notes[0].title).toBe('New Title');
  });
});

// ─── saveNote: orphan prevention (Bug #6 fix) ────────────────────────────────

describe('saveNote: non-atomic write failure handling', () => {
  it('cleans up orphaned note body when index write fails for a new note', () => {
    const note = makeNote({ id: 'orphan-test' });

    // Make the second setItem call (the index write) throw QuotaExceededError
    let callCount = 0;
    const originalSetItem = store.setItem.bind(store);
    store.setItem = (key: string, value: string) => {
      callCount++;
      if (callCount === 2) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      originalSetItem(key, value);
    };

    expect(() => saveNote(note, store)).toThrow();

    // Restore setItem
    store.setItem = originalSetItem;

    // The note body must have been cleaned up — no orphan
    expect(getNote(note.id, store)).toBeNull();
    expect(getAllNoteIds(store)).not.toContain(note.id);
  });

  it('does NOT clean up body when index write fails for an existing note update', () => {
    const note = makeNote({ id: 'existing' });
    saveNote(note, store); // first save succeeds

    // Make the index write fail on the second save (update)
    let callCount = 0;
    const originalSetItem = store.setItem.bind(store);
    store.setItem = (key: string, value: string) => {
      callCount++;
      if (callCount === 2) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      originalSetItem(key, value);
    };

    const updated = { ...note, content: 'new content', updatedAt: 2000 };
    expect(() => saveNote(updated, store)).toThrow();

    // Restore setItem
    store.setItem = originalSetItem;

    // The new body was written; the old index still references the note — not orphaned
    expect(getNote(note.id, store)?.content).toBe('new content');
  });
});

// ─── deleteNote ──────────────────────────────────────────────────────────────

describe('deleteNote', () => {
  it('removes the note and its id', () => {
    const note = makeNote();
    saveNote(note, store);
    deleteNote(note.id, store);
    expect(getNote(note.id, store)).toBeNull();
    expect(getAllNoteIds(store)).toHaveLength(0);
  });

  it('does not affect other notes', () => {
    saveNote(makeNote({ id: 'a' }), store);
    saveNote(makeNote({ id: 'b' }), store);
    deleteNote('a', store);
    expect(getNote('b', store)).not.toBeNull();
    expect(getAllNoteIds(store)).toEqual(['b']);
  });

  it('is a no-op for unknown id', () => {
    expect(() => deleteNote('nonexistent', store)).not.toThrow();
  });

  it('makes the note unretrievable after deletion', () => {
    const note = makeNote({ id: 'gone' });
    saveNote(note, store);
    deleteNote(note.id, store);
    expect(getAllNotes(store).find((n) => n.id === 'gone')).toBeUndefined();
  });
});

// ─── clearAll ────────────────────────────────────────────────────────────────

describe('clearAll', () => {
  it('removes all notes and list metadata', () => {
    saveNote(makeNote({ id: 'a' }), store);
    saveNote(makeNote({ id: 'b' }), store);
    clearAll(store);
    expect(getAllNoteIds(store)).toEqual([]);
    expect(getNote('a', store)).toBeNull();
  });

  it('also removes saved config', () => {
    saveConfig({ autoSaveStrategy: 'explicit', autoSaveDelayMs: 500 }, store);
    clearAll(store);
    // After clear, config should fall back to defaults
    expect(getConfig(store).autoSaveStrategy).toBe('debounced');
  });

  it('leaves store in a clean state for new notes', () => {
    saveNote(makeNote({ id: 'old' }), store);
    clearAll(store);
    saveNote(makeNote({ id: 'new' }), store);
    expect(getAllNoteIds(store)).toEqual(['new']);
  });
});

// ─── config ──────────────────────────────────────────────────────────────────

describe('config', () => {
  it('returns default config when none saved', () => {
    const config = getConfig(store);
    expect(config.autoSaveStrategy).toBe('debounced');
    expect(config.autoSaveDelayMs).toBe(1000);
  });

  it('saves and retrieves custom config', () => {
    saveConfig({ autoSaveStrategy: 'explicit', autoSaveDelayMs: 500 }, store);
    const config = getConfig(store);
    expect(config.autoSaveStrategy).toBe('explicit');
    expect(config.autoSaveDelayMs).toBe(500);
  });

  it('overwrites previous config on re-save', () => {
    saveConfig({ autoSaveStrategy: 'explicit', autoSaveDelayMs: 500 }, store);
    saveConfig({ autoSaveStrategy: 'debounced', autoSaveDelayMs: 2000 }, store);
    expect(getConfig(store).autoSaveDelayMs).toBe(2000);
  });

  it('returns default config for corrupted data', () => {
    store.setItem('vnotes:config', 'not-json');
    expect(getConfig(store).autoSaveStrategy).toBe('debounced');
  });
});

// ─── Data Persistence: full simulation of app reload ─────────────────────────

describe('persistence across simulated reload', () => {
  it('all notes survive a store re-read (simulating page refresh)', () => {
    // Simulate session 1: write notes
    const notes = [
      makeNote({ id: 'p1', title: 'Persisted One', content: '# One', updatedAt: 100, createdAt: 50 }),
      makeNote({ id: 'p2', title: 'Persisted Two', content: '**bold**', updatedAt: 200, createdAt: 60, isPinned: true }),
    ];
    notes.forEach((n) => saveNote(n, store));

    // Simulate session 2: read notes back (same store, mimicking localStorage)
    const reloaded = getAllNotes(store);
    expect(reloaded).toHaveLength(2);

    const r1 = reloaded.find((n) => n.id === 'p1')!;
    const r2 = reloaded.find((n) => n.id === 'p2')!;
    expect(r1).toEqual(notes[0]);
    expect(r2).toEqual(notes[1]);
  });

  it('sort order is preserved across re-read', () => {
    saveNote(makeNote({ id: 'old', updatedAt: 100 }), store);
    saveNote(makeNote({ id: 'new', updatedAt: 999 }), store);
    const ids = getAllNoteIds(store);
    expect(ids[0]).toBe('new');
    expect(ids[1]).toBe('old');
  });
});
