import type { PlaylistSnapshot } from '../core/Playlist.ts'
import type { LibraryState } from '../core/PlaylistLibrary.ts'

const PLAYLIST_KEY = 'orbit:v1:playlist'

function store(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readJson<T>(key: string): T | null {
  try {
    const raw = store()?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value))
  } catch {
    return
  }
}

function isSnapshot(value: unknown): value is PlaylistSnapshot {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<PlaylistSnapshot>
  return (
    Array.isArray(candidate.songs) &&
    candidate.songs.every((song) => typeof song?.id === 'string' && typeof song?.title === 'string') &&
    typeof candidate.currentIndex === 'number'
  )
}

export function loadPlaylist(): PlaylistSnapshot | null {
  const value = readJson<unknown>(PLAYLIST_KEY)
  return isSnapshot(value) ? value : null
}

export function savePlaylist(snapshot: PlaylistSnapshot): void {
  writeJson(PLAYLIST_KEY, snapshot)
}

const PREFS_KEY = 'orbit:v1:prefs'

export interface Prefs {
  volume: number
  vinyl: boolean
}

export function loadPrefs(): Prefs {
  const value = readJson<Partial<Prefs>>(PREFS_KEY)
  const volume = typeof value?.volume === 'number' && value.volume >= 0 && value.volume <= 100 ? value.volume : 80
  return { volume, vinyl: value?.vinyl === true }
}

export function savePrefs(patch: Partial<Prefs>): void {
  writeJson(PREFS_KEY, { ...loadPrefs(), ...patch })
}

const LIBRARY_KEY = 'orbit:v1:library'

export function loadLibrary(): LibraryState | null {
  const value = readJson<Partial<LibraryState>>(LIBRARY_KEY)
  if (!value || typeof value.activeId !== 'string' || !Array.isArray(value.entries)) return null
  const entries = value.entries.filter(
    (entry) => typeof entry?.id === 'string' && typeof entry?.name === 'string' && isSnapshot(entry.snapshot),
  )
  return entries.length > 0 ? { activeId: value.activeId, entries } : null
}

export function saveLibrary(state: LibraryState): void {
  writeJson(LIBRARY_KEY, state)
}
