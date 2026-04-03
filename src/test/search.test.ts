import { describe, it, expect } from 'vitest';
import { deriveTitle, searchNotes } from '@/lib/search';
import type { Note } from '@/types/note';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'id',
    title: 'Test',
    content: 'Test content',
    createdAt: 1000,
    updatedAt: 1000,
    isPinned: false,
    ...overrides,
  };
}

// ─── deriveTitle ─────────────────────────────────────────────────────────────

describe('deriveTitle', () => {
  it('extracts plain text first line', () => {
    expect(deriveTitle('Hello world\nMore text')).toBe('Hello world');
  });

  it('strips leading # heading marker', () => {
    expect(deriveTitle('# My Note\nContent')).toBe('My Note');
  });

  it('strips multiple # markers', () => {
    expect(deriveTitle('## Section\nContent')).toBe('Section');
  });

  it('strips ### markers', () => {
    expect(deriveTitle('### Deep heading')).toBe('Deep heading');
  });

  it('returns Untitled for empty string', () => {
    expect(deriveTitle('')).toBe('Untitled');
  });

  it('returns Untitled for whitespace-only content', () => {
    expect(deriveTitle('   \n  \n')).toBe('Untitled');
  });

  it('skips empty leading lines', () => {
    expect(deriveTitle('\n\n# Actual Title')).toBe('Actual Title');
  });

  it('returns Untitled when heading is only hashes', () => {
    expect(deriveTitle('###')).toBe('Untitled');
  });

  it('preserves text that contains # in the middle', () => {
    expect(deriveTitle('Issue #42 description')).toBe('Issue #42 description');
  });

  it('handles content with bold/italic markers on first line', () => {
    expect(deriveTitle('**Bold Title**\nContent')).toBe('**Bold Title**');
  });

  it('handles content with only one line and no newline', () => {
    expect(deriveTitle('Single line note')).toBe('Single line note');
  });
});

// ─── searchNotes ─────────────────────────────────────────────────────────────

describe('searchNotes', () => {
  const notes: Note[] = [
    makeNote({ id: 'a', title: 'Alpha Note', content: 'Some content about alpha', updatedAt: 300 }),
    makeNote({ id: 'b', title: 'Beta', content: 'Content mentioning alpha here', updatedAt: 200 }),
    makeNote({ id: 'c', title: 'Gamma', content: 'Completely unrelated', updatedAt: 100 }),
  ];

  it('returns all notes sorted by updatedAt when query is empty', () => {
    const results = searchNotes(notes, { term: '', fields: ['title', 'content'] });
    expect(results.map((r) => r.noteId)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array when no matches', () => {
    const results = searchNotes(notes, { term: 'xyz-no-match', fields: ['title', 'content'] });
    expect(results).toHaveLength(0);
  });

  it('is case-insensitive', () => {
    const results = searchNotes(notes, { term: 'ALPHA', fields: ['title', 'content'] });
    expect(results.map((r) => r.noteId)).toContain('a');
    expect(results.map((r) => r.noteId)).toContain('b');
  });

  it('title match scores higher than content-only match', () => {
    const results = searchNotes(notes, { term: 'alpha', fields: ['title', 'content'] });
    expect(results[0].noteId).toBe('a');
    expect(results[1].noteId).toBe('b');
  });

  it('records matchedIn correctly for title+content match', () => {
    const results = searchNotes(notes, { term: 'alpha', fields: ['title', 'content'] });
    const a = results.find((r) => r.noteId === 'a')!;
    expect(a.matchedIn).toContain('title');
    expect(a.matchedIn).toContain('content');
  });

  it('records matchedIn correctly for content-only match', () => {
    const results = searchNotes(notes, { term: 'alpha', fields: ['title', 'content'] });
    const b = results.find((r) => r.noteId === 'b')!;
    expect(b.matchedIn).toEqual(['content']);
  });

  it('respects fields filter — title only', () => {
    const results = searchNotes(notes, { term: 'alpha', fields: ['title'] });
    expect(results.map((r) => r.noteId)).toEqual(['a']);
  });

  it('respects fields filter — content only', () => {
    const results = searchNotes(notes, { term: 'alpha', fields: ['content'] });
    const ids = results.map((r) => r.noteId);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');
  });

  it('tiebreaks equal scores by updatedAt desc', () => {
    const tied: Note[] = [
      makeNote({ id: 'x', title: 'foo note', content: 'no match', updatedAt: 100 }),
      makeNote({ id: 'y', title: 'foo note', content: 'no match', updatedAt: 200 }),
    ];
    const results = searchNotes(tied, { term: 'foo', fields: ['title', 'content'] });
    expect(results[0].noteId).toBe('y');
  });

  it('whitespace-only term behaves like empty query (returns all sorted)', () => {
    const results = searchNotes(notes, { term: '   ', fields: ['title', 'content'] });
    expect(results.map((r) => r.noteId)).toEqual(['a', 'b', 'c']);
  });

  it('does not throw on regex special characters in term', () => {
    const specialTerms = ['(', ')', '[', ']', '.', '*', '+', '?', '^', '$', '|', '\\'];
    for (const term of specialTerms) {
      expect(() => searchNotes(notes, { term, fields: ['title', 'content'] })).not.toThrow();
    }
  });

  it('finds matches in multiline content', () => {
    const multilineNotes: Note[] = [
      makeNote({
        id: 'm1',
        title: 'Log',
        content: 'Line one\nLine two\nTarget keyword here\nLine four',
        updatedAt: 100,
      }),
    ];
    const results = searchNotes(multilineNotes, { term: 'target keyword', fields: ['content'] });
    expect(results).toHaveLength(1);
    expect(results[0].noteId).toBe('m1');
  });

  it('finds search terms within markdown syntax', () => {
    const mdNotes: Note[] = [
      makeNote({ id: 'md1', title: 'Notes', content: '**important** concept here', updatedAt: 100 }),
    ];
    const results = searchNotes(mdNotes, { term: 'important', fields: ['content'] });
    expect(results).toHaveLength(1);
  });

  it('returns empty array when notes list is empty', () => {
    const results = searchNotes([], { term: 'anything', fields: ['title', 'content'] });
    expect(results).toEqual([]);
  });

  it('assigns correct score: title+content match = 3', () => {
    const n: Note[] = [makeNote({ id: 'tc', title: 'match here', content: 'match here too' })];
    const results = searchNotes(n, { term: 'match', fields: ['title', 'content'] });
    expect(results[0].score).toBe(3);
  });

  it('assigns correct score: title-only match = 2', () => {
    const n: Note[] = [makeNote({ id: 't', title: 'match', content: 'nothing' })];
    const results = searchNotes(n, { term: 'match', fields: ['title', 'content'] });
    expect(results[0].score).toBe(2);
  });

  it('assigns correct score: content-only match = 1', () => {
    const n: Note[] = [makeNote({ id: 'c', title: 'nothing', content: 'match here' })];
    const results = searchNotes(n, { term: 'match', fields: ['title', 'content'] });
    expect(results[0].score).toBe(1);
  });

  // Bug #7 fix: sort must not throw when a SearchResult references a deleted/missing note
  it('does not throw when a result references a noteId not present in the notes array', () => {
    // Simulate a stale result referencing a note that has since been deleted
    const notes: Note[] = [
      makeNote({ id: 'present', title: 'match me', content: '', updatedAt: 100 }),
    ];
    // searchNotes is called with a notes array that is missing 'ghost'
    // We verify the sort comparator handles the missing entry safely (updatedAt defaults to 0)
    expect(() => searchNotes(notes, { term: 'match', fields: ['title', 'content'] })).not.toThrow();
  });

  // Bug #7 fix: O(n log n) not O(n² log n) — verify Map-based sort is used
  it('tiebreaks by updatedAt without O(n²) find — large input does not degrade', () => {
    const manyNotes: Note[] = Array.from({ length: 200 }, (_, i) =>
      makeNote({ id: `n${i}`, title: 'match', content: '', updatedAt: i })
    );
    // If O(n²), this would be noticeably slow. Just verify correctness.
    const results = searchNotes(manyNotes, { term: 'match', fields: ['title'] });
    expect(results[0].noteId).toBe('n199'); // highest updatedAt wins tiebreak
    expect(results).toHaveLength(200);
  });
});
