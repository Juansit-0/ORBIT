import type { PlaylistSnapshot } from '../core/Playlist.ts'

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
