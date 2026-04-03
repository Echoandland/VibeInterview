import type { Note, SearchQuery, SearchResult } from '@/types/note';

export function deriveTitle(content: string): string {
  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) return 'Untitled';

  // Strip leading # characters and whitespace
  return firstLine.replace(/^#+\s*/, '').trim() || 'Untitled';
}

export function searchNotes(notes: Note[], query: SearchQuery): SearchResult[] {
  const term = query.term.trim().toLowerCase();

  if (!term) {
    return notes
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((note) => ({
        noteId: note.id,
        matchedIn: [],
        score: 0,
      }));
  }

  const results: SearchResult[] = [];

  for (const note of notes) {
    let score = 0;
    const matchedIn: ('title' | 'content')[] = [];

    if (query.fields.includes('title') && note.title.toLowerCase().includes(term)) {
      score += 2;
      matchedIn.push('title');
    }

    if (query.fields.includes('content') && note.content.toLowerCase().includes(term)) {
      score += 1;
      matchedIn.push('content');
    }

    if (score > 0) {
      results.push({ noteId: note.id, matchedIn, score });
    }
  }

  const noteMap = new Map(notes.map((n) => [n.id, n]));
  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const updAtA = noteMap.get(a.noteId)?.updatedAt ?? 0;
    const updAtB = noteMap.get(b.noteId)?.updatedAt ?? 0;
    return updAtB - updAtA;
  });
}
