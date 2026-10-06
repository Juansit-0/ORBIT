# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + strict TypeScript, vanilla (no UI framework), Three.js for the particle scene, GSAP for UI motion, Vitest and Playwright for tests, Vercel Functions for the API. Deployed on Vercel and runnable locally with `npm run dev`.

## Users

A university professor grading the "Taller Listas Dobles" assignment, who will test every operation by hand and look for edge cases, and the student who built it, who must demo and explain it. Secondary: anyone opening the public Vercel link to listen to music.

## Product Purpose

Orbit is a music player whose playlist is a doubly linked list. It must let the user add a song at the start, at the end or at any position, remove songs, skip forward and backward, and play any song found on the internet in full. Success means every operation is correct under hostile manual testing, the list structure is visible and explainable, and the experience is memorable.

## Positioning

The data structure is the interface: a live node visualizer shows head, tail and prev/next pointers reacting to every operation, while the current song is rendered as a 3D particle sun that the queue orbits.

## Operating Context

Demoed on a laptop in class and tested by the professor on their own machine through the Vercel URL. Search uses the iTunes Search API; full playback uses the YouTube IFrame Player (which must remain visible, at least 200x200 px); the 30 second iTunes preview is the fallback when YouTube cannot be used.

## Capabilities and Constraints

- Add first, add last, insert at a 1-based position; remove; next; previous; play any queued song.
- Shuffle, repeat (off, all, one), drag to reorder and Alt+Arrow reordering, queue filter, keyboard shortcuts, persistence in localStorage.
- Phase B: undo/redo, synced lyrics (LRCLIB), Media Session, multiple playlists, sleep timer.
- Audio frequencies from YouTube cannot be analyzed (cross-origin iframe), so the scene pulse is simulated from playback state.
- YouTube Data API quota is about 99 new songs per day.
- All code and UI copy in English. No code comments. No emojis anywhere.

## Brand Commitments

Name: Orbit. The user asked for a light interface (never black or dark), visually striking and unique, with a 3D particle form that has custom lighting, camera motion and subtle cursor interaction where the cursor changes what it passes over. Chosen palette direction: pale sky with orange.

## Evidence on Hand

No logo, imagery or testimonials exist. Song artwork comes from iTunes at runtime. Do not fabricate users, stats or reviews.

## Product Principles

1. Correctness first: every list operation must behave predictably at the edges and explain itself when it refuses.
2. Make the structure visible: the doubly linked list is something you can see, not only something you trust.
3. Motion with meaning: animation shows what changed in the list or playback, never decoration for its own sake.
4. Never a dead end: every action resolves with visible feedback, and playback degrades gracefully instead of failing.

## Accessibility & Inclusion

WCAG 2.1 AA contrast, full keyboard operation (every action reachable without a mouse), `prefers-reduced-motion` honored with a static scene, touch-friendly targets on mobile.
