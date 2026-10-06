# Orbit

A music player built in TypeScript on top of a doubly linked list. Search any song, queue it at the start, the end or any position, and play it in full while a 3D particle planet reacts to the music and to your cursor.

## The doubly linked list

| File | What it does |
| --- | --- |
| `src/core/ListNode.ts` | Node with `value`, `prev` and `next` |
| `src/core/DoublyLinkedList.ts` | `addFirst`, `addLast`, `insertAt`, `insertNodeAt`, `removeAt`, `removeNode`, `removeById`, `move`, `getNode` (walks from the closest end), forward and reverse traversal |
| `src/core/Playlist.ts` | Current song pointer, `next` and `previous` through the links, removing the playing song, repeat modes, shuffle order kept in a second linked list so the real order never changes |
| `src/core/CommandHistory.ts` | Undo and redo stacks built on the same list |
| `src/core/PlaylistLibrary.ts` | Several playlists stored as a linked list of playlists |

The linked list dock in the interface draws the live structure: `null`, `HEAD`, every node with its `next` and `prev` links, `TAIL` and `null`.

## Features

- Add a song first, last or at an exact position (1 to size + 1), with clear errors for invalid positions
- Remove any song, including the one playing, which hands over to the next or previous song
- Next and previous, repeat off, all or one, and shuffle
- Drag to reorder, or use the arrow buttons or `Alt` + arrow keys
- Undo and redo for every change
- Search the iTunes catalog and play full tracks through YouTube, with a 30 second preview fallback
- Synced lyrics from LRCLIB, click a line to jump to it
- Several playlists, a sleep timer, system media controls and keyboard shortcuts
- Interactive particle planet: cursor trail, click shockwave, morph into the cover on track change and lighting tinted by the cover

## Run it

Requires Node.js 22 or newer and a YouTube Data API key. See [docs/SETUP.md](docs/SETUP.md).

```bash
npm install
cp .env.example .env
npm run dev
```

## Test it

```bash
npm test
npm run e2e
npm run typecheck
npm run lint
```

`npm test` runs the unit tests (Vitest). `npm run e2e` builds the app with a deterministic fake player and runs the end-to-end suite (Playwright) on desktop and mobile viewports.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Space` | Play or pause |
| `→` / `←` | Next or previous song |
| `Shift` + `→` / `←` | Forward or back 10 seconds |
| `S` / `R` | Shuffle / cycle repeat |
| `M` | Mute |
| `L` | Lyrics |
| `/` | Search |
| `F` | Filter the flight plan |
| `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | Undo / redo |
| `Alt` + `↑` / `↓` | Move the focused song |
| `Delete` | Remove the focused song |
| `?` | Show all shortcuts |

## Stack

Vite, TypeScript, Three.js, GSAP, Vitest, Playwright, Vercel Functions.
