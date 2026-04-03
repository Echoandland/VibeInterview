import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNoteStore } from '@/store/noteStore';
import { useAutoSave } from '@/hooks/useAutoSave';

// Mock storage so the store doesn't touch localStorage
vi.mock('@/lib/storage', () => ({
  getAllNotes: vi.fn(() => []),
  getConfig: vi.fn(() => ({ autoSaveStrategy: 'debounced', autoSaveDelayMs: 1000 })),
  saveNote: vi.fn(),
  deleteNote: vi.fn(),
  saveConfig: vi.fn(),
}));

import * as storageMock from '@/lib/storage';

beforeEach(() => {
  vi.useFakeTimers();
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

afterEach(() => {
  vi.useRealTimers();
});

// ─── saveStatus states ────────────────────────────────────────────────────────

describe('saveStatus', () => {
  it('is "idle" when no note is active and nothing has happened', () => {
    const { result } = renderHook(() => useAutoSave(null));
    expect(result.current.saveStatus).toBe('idle');
  });

  it('is "idle" when noteId provided but isDirty=false and lastSavedAt=null', () => {
    const noteId = 'note-1';
    const { result } = renderHook(() => useAutoSave(noteId));
    expect(result.current.saveStatus).toBe('idle');
  });

  it('is "unsaved" when isDirty is true', () => {
    act(() => { useNoteStore.setState({ isDirty: true }); });
    const { result } = renderHook(() => useAutoSave('note-1'));
    expect(result.current.saveStatus).toBe('unsaved');
  });

  it('is "saving" when isSaving is true (takes priority over isDirty)', () => {
    act(() => { useNoteStore.setState({ isDirty: true, isSaving: true }); });
    const { result } = renderHook(() => useAutoSave('note-1'));
    expect(result.current.saveStatus).toBe('saving');
  });

  it('is "saved" after note has been saved (isDirty=false, lastSavedAt set)', () => {
    act(() => { useNoteStore.setState({ isDirty: false, lastSavedAt: Date.now() }); });
    const { result } = renderHook(() => useAutoSave('note-1'));
    expect(result.current.saveStatus).toBe('saved');
  });

  it('transitions from unsaved to saved after saving', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, '# Title'); });

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    expect(autoSaveResult.current.saveStatus).toBe('unsaved');

    act(() => { result.current.saveNote(noteId!); });
    expect(autoSaveResult.current.saveStatus).toBe('saved');
  });
});

// ─── forceSave ────────────────────────────────────────────────────────────────

describe('forceSave', () => {
  it('calls saveNote immediately for the given noteId', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    vi.clearAllMocks();

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    act(() => { autoSaveResult.current.forceSave(); });

    expect(storageMock.saveNote).toHaveBeenCalledOnce();
    expect(vi.mocked(storageMock.saveNote).mock.calls[0][0].id).toBe(noteId!);
  });

  it('does nothing when noteId is null', () => {
    const { result } = renderHook(() => useAutoSave(null));
    act(() => { result.current.forceSave(); });
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });

  it('sets isDirty to false immediately', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'changes'); });

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    expect(autoSaveResult.current.saveStatus).toBe('unsaved');
    act(() => { autoSaveResult.current.forceSave(); });
    expect(autoSaveResult.current.saveStatus).toBe('saved');
  });

  it('cancels a pending debounce before saving', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'typed content'); });
    vi.clearAllMocks();

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    // forceSave before the debounce timer fires
    act(() => { autoSaveResult.current.forceSave(); });
    // Advance past debounce delay — should NOT trigger a second save
    act(() => { vi.advanceTimersByTime(1000); });

    expect(storageMock.saveNote).toHaveBeenCalledOnce();
  });
});

// ─── debounced auto-save strategy ────────────────────────────────────────────

describe('debounced auto-save', () => {
  it('does not save immediately when content changes', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'typing...'); });
    vi.clearAllMocks();

    renderHook(() => useAutoSave(noteId!));
    // No time has passed yet
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });

  it('saves after debounce delay (1000ms default)', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'typing...'); });
    vi.clearAllMocks();

    renderHook(() => useAutoSave(noteId!));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(storageMock.saveNote).toHaveBeenCalledOnce();
  });

  it('does not save before debounce delay expires', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'typing...'); });
    vi.clearAllMocks();

    renderHook(() => useAutoSave(noteId!));
    act(() => { vi.advanceTimersByTime(999); });
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });
});

// ─── explicit save strategy ───────────────────────────────────────────────────

describe('explicit save strategy', () => {
  beforeEach(() => {
    act(() => {
      useNoteStore.setState({
        config: { autoSaveStrategy: 'explicit', autoSaveDelayMs: 1000 },
      });
    });
  });

  it('does NOT auto-save even after delay when strategy is explicit', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'changes'); });
    vi.clearAllMocks();

    renderHook(() => useAutoSave(noteId!));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });

  it('forceSave still works with explicit strategy', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    vi.clearAllMocks();

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    act(() => { autoSaveResult.current.forceSave(); });
    expect(storageMock.saveNote).toHaveBeenCalledOnce();
  });

  it('saveStatus is "unsaved" (not auto-resolved) when dirty with explicit strategy', () => {
    const { result } = renderHook(() => useNoteStore());
    let noteId: string;
    act(() => { noteId = result.current.createNote(); });
    act(() => { result.current.updateNoteContent(noteId!, 'changes'); });

    const { result: autoSaveResult } = renderHook(() => useAutoSave(noteId!));
    act(() => { vi.advanceTimersByTime(5000); });
    expect(autoSaveResult.current.saveStatus).toBe('unsaved');
  });
});

// ─── noteId = null ────────────────────────────────────────────────────────────

describe('with no active note (noteId = null)', () => {
  it('does not auto-save even when isDirty=true', () => {
    act(() => { useNoteStore.setState({ isDirty: true }); });
    renderHook(() => useAutoSave(null));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(storageMock.saveNote).not.toHaveBeenCalled();
  });
});
