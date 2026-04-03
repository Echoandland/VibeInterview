# Markdown Notes

A fast, distraction-free note-taking app with live Markdown preview. Everything runs in the browser — no account, no server, no sync. Your notes are saved locally and persist across sessions.

---

## Features

- **Split-pane layout** — note list, editor, and live preview side by side
- **Markdown rendering** — headings, bold, italic, lists, code blocks, links, tables, task lists, strikethrough
- **Auto-save** — notes save automatically 1 second after you stop typing
- **Full-text search** — searches both title and content in real time
- **Persistent storage** — notes survive page refreshes via localStorage
- **Zero dependencies on a backend** — everything runs client-side

---

## Getting Started

**Requirements:** Node.js 18+

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

```bash
# Production build
npm run build

# Preview the production build locally
npm run preview
```

---

## User Guide

### Creating a note

Click the **+** button at the top of the sidebar, or use the **New note** button on the empty-state screen. A new "Untitled" note is created and immediately selected.

### Writing in Markdown

The editor accepts standard Markdown. The preview pane on the right renders your content live as you type. Supported syntax:

| Syntax | Renders as |
|---|---|
| `# Heading 1` / `## Heading 2` | Headings H1–H6 |
| `**bold**` | **Bold** |
| `*italic*` | *Italic* |
| `~~strikethrough~~` | ~~Strikethrough~~ |
| `- item` or `* item` | Unordered list |
| `1. item` | Ordered list |
| `- [x] done` / `- [ ] todo` | Task list with checkboxes |
| `` `inline code` `` | Inline code |
| ` ``` ` fenced block ` ``` ` | Code block |
| `[text](url)` | Link (opens in new tab) |
| `> quote` | Blockquote |
| `\| col \| col \|` table syntax | Table |

### Note title

The note title shown in the sidebar is derived automatically from the first line of your content. A `# Heading` line has the `#` stripped; a plain text line is used as-is. An empty note is titled "Untitled".

### Saving

Notes **auto-save** one second after you stop typing. The toolbar shows the current save state:

| Badge | Meaning |
|---|---|
| *(none)* | No changes since last session |
| **Unsaved** (amber) | Unsaved changes exist |
| **Saving…** (purple) | Write in progress |
| **Saved** (green) | All changes persisted |

Click the **Save** button at any time to force an immediate save.

### Searching

Type in the search box at the top of the sidebar. Results update instantly and search both title and content (case-insensitive). Notes where the search term appears in the title rank above content-only matches. Clear the search box to return to the full list.

### Deleting a note

Select the note you want to remove, then click **Delete** in the editor toolbar. The next note in the list becomes selected automatically. If no notes remain, the app returns to the empty state.

### Note ordering

The sidebar always sorts notes by **last modified** time, newest first. Saving a note moves it to the top of the list.

---

## Keyboard Tips

| Action | How |
|---|---|
| New note | Click **+** in the sidebar |
| Save immediately | Click **Save** in the toolbar |
| Switch notes | Click any note in the sidebar |
| Clear search | Click × in the search box or select all and delete |

---

## Data & Privacy

All notes are stored in your browser's **localStorage** under keys prefixed with `vnotes:`. No data is sent to any server.

To inspect or clear your data, paste this into the browser DevTools console (`F12`):

```js
// View all stored notes
const keys = Object.keys(localStorage).filter(k => k.startsWith('vnotes:'));
keys.forEach(k => console.log(k, JSON.parse(localStorage.getItem(k))));
```

```js
// Delete all notes (irreversible)
Object.keys(localStorage)
  .filter(k => k.startsWith('vnotes:'))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| State management | Zustand + Immer |
| Markdown rendering | react-markdown + remark-gfm |
| Persistence | localStorage |
| Testing | Vitest + Testing Library |

---

## Running Tests

```bash
# Run all tests once
npx vitest run

# Watch mode (re-runs on file save)
npx vitest

# Type-check without building
npx tsc --noEmit
```

176 tests across 6 test files covering storage, search, state management, markdown rendering, debounce utilities, and auto-save behaviour.
