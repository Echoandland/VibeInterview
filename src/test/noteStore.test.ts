import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNoteStore } from '@/store/noteStore';

// Mock the storage module so tests don't touch localStorage
vi.mock('@/lib/storage', () => ({
  getAllNotes: vi.fn(() => []),
  getConfig: vi.fn(() => ({ autoSaveStrategy: 'debounced', autoSaveDelayMs: 1000 })),
  saveNote: vi.fn(),
  deleteNote: vi.fn(),
  saveConfig: vi.fn(),
}));

import * as storageMock from '@/lib/storage';

function getStore() {
  return renderHook(() => useNoteStore());
}

beforeEach(() => {
  vi.clearAllMocks();
  act(() => {
    useNoteStore.setState({
      notes: { ids: [], entities: {} },
      activeNoteId: null,
      searchQuery: { term: '', fields: ['title', 'content'] },
      searchResults: [],
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      config: { autoSaveStrategy: 'debounced', autoSaveDelayMs: 1000 },
    });
  });
});

// ─── initialize ───────────────────────────────────────────────────────────────

describe('initialize', () => {
  it('loads notes from storage', () => {
    vi.mocked(storageMock.getAllNotes).mockReturnValueOnce([
      { id: 'a', title: 'A', content: '# A', createdAt: 1, updatedAt: 1, isPinned: false },
    ]);
    const { result } = getStore();
    act(() => result.current.initialize());
    expect(result.current.notes.ids).toContain('a');
    expect(result.current.notes.entities['a'].title).toBe('A');
  });

  it('loads multiple notes and preserves their data', () => {
    vi.mocked(storageMock.getAllNotes).mockReturnValueOnce([
      { id: 'x', title: 'X', content: 'x content', createdAt: 1, updatedAt: 100, isPinned: false },
      { id: 'y', title: 'Y', content: 'y content', createdAt: 2, updatedAt: 200, isPinned: true },
    ]);
    const { result } = getStore();
    act(() => result.current.initialize());
    expect(result.current.notes.ids).toHaveLength(2);
    expect(result.current.notes.entities['y'].isPinned).toBe(true);
    expect(result.current.notes.entities['x'].content).toBe('x content');
  });

  it('preserves the order returned by storage', () => {
    vi.mocked(storageMock.getAllNotes).mockReturnValueOnce([
      { id: 'first', title: 'F', content: '', createdAt: 1, updatedAt: 200, isPinned: false },
      { id: 'second', title: 'S', content: '', createdAt: 2, updatedAt: 100, isPinned: false },
    ]);
    const { result } = getStore();
    act(() => result.current.initialize());
    expect(result.current.notes.ids[0]).toBe('first');
    expect(result.current.notes.ids[1]).toBe('second');
  });

  it('resets in-memory state before loading', () => {
    const { result } = getStore();
    act(() => { result.current.createNote(); });
    vi.mocked(storageMock.getAllNotes).mockReturnValueOnce([]);
    act(() => result.current.initialize());
    expect(result.current.notes.ids).toHaveLength(0);
  });
});

// ─── createNote ───────────────────────────────────────────────────────────────

describe('createNote', () => {
  it('adds a note to ids and entities', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    expect(result.current.notes.ids).toContain(id!);
    expect(result.current.notes.entities[id!]).toBeDefined();
  });

  it('sets the new note as active', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    expect(result.current.activeNoteId).toBe(id!);
  });

  it('persists to storage', () => {
    const { result } = getStore();
    act(() => { result.current.createNote(); });
    expect(storageMock.saveNote).toHaveBeenCalledOnce();
  });

  it('sets isDirty to false', () => {
    const { result } = getStore();
    act(() => { result.current.createNote(); });
    expect(result.current.isDirty).toBe(false);
  });

  it('new note is placed at front of ids (most recently created first)', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { idB = result.current.createNote(); });
    expect(result.current.notes.ids[0]).toBe(idB!);
    expect(result.current.notes.ids[1]).toBe(idA!);
  });

  it('new note has empty content and Untitled title', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    const note = result.current.notes.entities[id!];
    expect(note.content).toBe('');
    expect(note.title).toBe('Untitled');
  });

  it('new note has createdAt and updatedAt set', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    const note = result.current.notes.entities[id!];
    expect(note.createdAt).toBeGreaterThan(0);
    expect(note.updatedAt).toBeGreaterThan(0);
  });

  it('each note gets a unique id', () => {
    const { result } = getStore();
    let id1: string, id2: string, id3: string;
    act(() => { id1 = result.current.createNote(); });
    act(() => { id2 = result.current.createNote(); });
    act(() => { id3 = result.current.createNote(); });
    expect(new Set([id1!, id2!, id3!]).size).toBe(3);
  });
});

// ─── updateNoteContent ────────────────────────────────────────────────────────

describe('updateNoteContent', () => {
  it('updates content in entities', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, '# New Title\nBody'); });
    expect(result.current.notes.entities[id!].content).toBe('# New Title\nBody');
  });

  it('derives title from content', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, '# My Heading\nContent'); });
    expect(result.current.notes.entities[id!].title).toBe('My Heading');
  });

  it('sets isDirty to true', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, 'Some content'); });
    expect(result.current.isDirty).toBe(true);
  });

  it('does NOT call storage.saveNote', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    vi.clearAllMocks();
    act(() => { result.current.updateNoteContent(id!, 'Some content'); });
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });

  it('is a no-op for unknown id — does not throw', () => {
    const { result } = getStore();
    expect(() => {
      act(() => { result.current.updateNoteContent('nonexistent-id', 'content'); });
    }).not.toThrow();
  });

  it('title becomes Untitled when content is cleared', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, '# Had a title'); });
    act(() => { result.current.updateNoteContent(id!, ''); });
    expect(result.current.notes.entities[id!].title).toBe('Untitled');
  });
});

// ─── saveNote ─────────────────────────────────────────────────────────────────

describe('saveNote', () => {
  it('calls storage.saveNote', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    vi.clearAllMocks();
    act(() => { result.current.saveNote(id!); });
    expect(storageMock.saveNote).toHaveBeenCalledOnce();
  });

  it('sets isDirty to false', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, 'content'); });
    act(() => { result.current.saveNote(id!); });
    expect(result.current.isDirty).toBe(false);
  });

  it('sets lastSavedAt', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.saveNote(id!); });
    expect(result.current.lastSavedAt).not.toBeNull();
  });

  it('moves saved note to front of ids list', () => {
    const { result } = getStore();
    let idA: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { result.current.createNote(); });
    act(() => { result.current.saveNote(idA!); });
    expect(result.current.notes.ids[0]).toBe(idA!);
  });

  it('is a no-op for unknown id — does not throw', () => {
    const { result } = getStore();
    expect(() => {
      act(() => { result.current.saveNote('nonexistent-id'); });
    }).not.toThrow();
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });

  it('passes saved note content to storage', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, '# Saved\nContent here'); });
    vi.clearAllMocks();
    act(() => { result.current.saveNote(id!); });
    const savedArg = vi.mocked(storageMock.saveNote).mock.calls[0][0];
    expect(savedArg.content).toBe('# Saved\nContent here');
    expect(savedArg.title).toBe('Saved');
  });

  // Bug #1 fix: isSaving must transition through true before the storage write
  it('sets isSaving to true before writing to storage, then false after', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });

    const savingStates: boolean[] = [];
    vi.mocked(storageMock.saveNote).mockImplementationOnce(() => {
      // Capture isSaving at the moment storage is called
      savingStates.push(useNoteStore.getState().isSaving);
    });

    act(() => { result.current.saveNote(id!); });

    expect(savingStates).toEqual([true]);   // was true during storage write
    expect(result.current.isSaving).toBe(false); // false after completion
  });
});

// ─── deleteNote ───────────────────────────────────────────────────────────────

describe('deleteNote', () => {
  it('removes note from ids and entities', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.deleteNote(id!); });
    expect(result.current.notes.ids).not.toContain(id!);
    expect(result.current.notes.entities[id!]).toBeUndefined();
  });

  it('calls storage.deleteNote', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    vi.clearAllMocks();
    act(() => { result.current.deleteNote(id!); });
    expect(storageMock.deleteNote).toHaveBeenCalledWith(id!);
  });

  it('clears activeNoteId when active note is deleted (only one note)', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.deleteNote(id!); });
    expect(result.current.activeNoteId).toBeNull();
  });

  it('activates next note when active note is deleted', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { idB = result.current.createNote(); });
    act(() => { result.current.setActiveNote(idB!); });
    act(() => { result.current.deleteNote(idB!); });
    expect(result.current.activeNoteId).toBe(idA!);
  });

  it('does not affect non-active note deletion — active stays active', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { idB = result.current.createNote(); });
    act(() => { result.current.setActiveNote(idB!); });
    act(() => { result.current.deleteNote(idA!); }); // delete the non-active note
    expect(result.current.activeNoteId).toBe(idB!);
  });

  it('resets isDirty when deleting the active note', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, 'unsaved changes'); });
    act(() => { result.current.deleteNote(id!); });
    expect(result.current.isDirty).toBe(false);
  });
});

// ─── setActiveNote ────────────────────────────────────────────────────────────

describe('setActiveNote', () => {
  it('updates activeNoteId', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { idB = result.current.createNote(); });
    act(() => { result.current.setActiveNote(idA!); });
    expect(result.current.activeNoteId).toBe(idA!);
  });

  it('resets isDirty on note switch', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { idB = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(idB!, 'changed'); });
    act(() => { result.current.setActiveNote(idA!); });
    expect(result.current.isDirty).toBe(false);
  });

  it('accepts null to deselect all notes', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.setActiveNote(null); });
    expect(result.current.activeNoteId).toBeNull();
  });
});

// ─── setSearchQuery ───────────────────────────────────────────────────────────

describe('setSearchQuery', () => {
  it('updates searchQuery term', () => {
    const { result } = getStore();
    act(() => { result.current.setSearchQuery({ term: 'hello' }); });
    expect(result.current.searchQuery.term).toBe('hello');
  });

  it('returns all notes when query is empty', () => {
    const { result } = getStore();
    act(() => { result.current.createNote(); });
    act(() => { result.current.createNote(); });
    act(() => { result.current.setSearchQuery({ term: '' }); });
    expect(result.current.searchResults).toHaveLength(2);
  });

  it('filters to matching notes', () => {
    const { result } = getStore();
    let idA: string, idB: string;
    act(() => { idA = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(idA!, '# Typescript notes\nContent about TS'); });
    act(() => { idB = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(idB!, '# Python notes\nContent about Python'); });
    act(() => { result.current.setSearchQuery({ term: 'typescript' }); });
    const matchIds = result.current.searchResults.map((r) => r.noteId);
    expect(matchIds).toContain(idA!);
    expect(matchIds).not.toContain(idB!);
  });

  it('returns empty results when no notes match', () => {
    const { result } = getStore();
    act(() => { result.current.createNote(); });
    act(() => { result.current.setSearchQuery({ term: 'zzznomatch' }); });
    expect(result.current.searchResults).toHaveLength(0);
  });

  it('search results update after note content is saved', () => {
    const { result } = getStore();
    let id: string;
    act(() => { id = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(id!, '# React hooks\nContent'); });
    act(() => { result.current.saveNote(id!); });
    act(() => { result.current.setSearchQuery({ term: 'react' }); });
    expect(result.current.searchResults.map((r) => r.noteId)).toContain(id!);
  });

  it('can update just the fields array', () => {
    const { result } = getStore();
    act(() => { result.current.setSearchQuery({ fields: ['title'] }); });
    expect(result.current.searchQuery.fields).toEqual(['title']);
  });
});

// ─── updateConfig ─────────────────────────────────────────────────────────────

describe('updateConfig', () => {
  it('updates autoSaveStrategy', () => {
    const { result } = getStore();
    act(() => { result.current.updateConfig({ autoSaveStrategy: 'explicit' }); });
    expect(result.current.config.autoSaveStrategy).toBe('explicit');
  });

  it('updates autoSaveDelayMs', () => {
    const { result } = getStore();
    act(() => { result.current.updateConfig({ autoSaveDelayMs: 2000 }); });
    expect(result.current.config.autoSaveDelayMs).toBe(2000);
  });

  it('calls storage.saveConfig', () => {
    const { result } = getStore();
    act(() => { result.current.updateConfig({ autoSaveStrategy: 'explicit' }); });
    expect(storageMock.saveConfig).toHaveBeenCalledOnce();
    // Verify updated value via store state (immer proxy is revoked after the transaction)
    expect(result.current.config.autoSaveStrategy).toBe('explicit');
  });

  // Bug #3 fix: storage.saveConfig must receive a plain object, not an Immer proxy
  it('passes a plain (non-proxy) object to storage.saveConfig', () => {
    const { result } = getStore();
    let capturedArg: unknown;
    vi.mocked(storageMock.saveConfig).mockImplementationOnce((cfg) => {
      capturedArg = cfg;
    });
    act(() => { result.current.updateConfig({ autoSaveDelayMs: 750 }); });
    // A plain object is extensible and has no Proxy traps
    expect(Object.isExtensible(capturedArg)).toBe(true);
    expect((capturedArg as { autoSaveDelayMs: number }).autoSaveDelayMs).toBe(750);
  });

  it('partial update does not overwrite unrelated fields', () => {
    const { result } = getStore();
    act(() => { result.current.updateConfig({ autoSaveDelayMs: 500 }); });
    // autoSaveStrategy should remain at its default
    expect(result.current.config.autoSaveStrategy).toBe('debounced');
  });
});

// ─── Note List: sorted by last modified ───────────────────────────────────────

describe('note list ordering (sidebar sort)', () => {
  it('newly created notes appear before older ones', () => {
    const { result } = getStore();
    let first: string, second: string, third: string;
    act(() => { first = result.current.createNote(); });
    act(() => { second = result.current.createNote(); });
    act(() => { third = result.current.createNote(); });
    const ids = result.current.notes.ids;
    expect(ids[0]).toBe(third!);
    expect(ids[1]).toBe(second!);
    expect(ids[2]).toBe(first!);
  });

  it('saving a note moves it to the front', () => {
    const { result } = getStore();
    let oldest: string;
    act(() => { oldest = result.current.createNote(); });
    act(() => { result.current.createNote(); });
    // oldest is at position [1] — save it so it becomes most recently modified
    act(() => { result.current.saveNote(oldest!); });
    expect(result.current.notes.ids[0]).toBe(oldest!);
  });
});
