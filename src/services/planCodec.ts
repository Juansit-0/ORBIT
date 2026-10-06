import type { Song } from '../core/types.ts'

export interface SharedPlan {
  name: string
  ids: string[]
}

export interface ImportedPlan {
  name: string
  songs: Song[]
}

export const MAX_SHARED = 150

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4)
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function encodePlan(name: string, songs: Song[]): string {
  const ids = songs.map((song) => song.id).filter((id) => /^\d+$/.test(id)).slice(0, MAX_SHARED)
  return toBase64Url(JSON.stringify({ n: name.slice(0, 40), i: ids.join('.') }))
}

export function decodePlan(value: string): SharedPlan | null {
  try {
    const data = JSON.parse(fromBase64Url(value)) as { n?: unknown; i?: unknown }
    if (typeof data.n !== 'string' || typeof data.i !== 'string') return null
    const ids = data.i.split('.').filter((id) => /^\d{1,12}$/.test(id)).slice(0, MAX_SHARED)
    const name = data.n.trim().slice(0, 40)
    return ids.length > 0 && name ? { name, ids } : null
  } catch {
    return null
  }
}

function cleanSong(value: unknown): Song | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string' || typeof raw.artist !== 'string') return null
  const song: Song = {
    id: raw.id,
    title: raw.title.slice(0, 200),
    artist: raw.artist.slice(0, 200),
    album: typeof raw.album === 'string' ? raw.album.slice(0, 200) : '',
    artworkUrl: typeof raw.artworkUrl === 'string' && /^https:\/\//.test(raw.artworkUrl) ? raw.artworkUrl : '',
    durationMs: typeof raw.durationMs === 'number' && Number.isFinite(raw.durationMs) && raw.durationMs >= 0 ? raw.durationMs : 0,
  }
  if (typeof raw.previewUrl === 'string' && /^https:\/\//.test(raw.previewUrl)) song.previewUrl = raw.previewUrl
  if (typeof raw.genre === 'string') song.genre = raw.genre
  return song
}

export function exportPlan(name: string, songs: Song[]): string {
  return JSON.stringify(
    {
      app: 'orbit',
      version: 1,
      name,
      songs: songs.map((song) => cleanSong(song)),
    },
    null,
    2,
  )
}

export function parseImport(text: string): ImportedPlan | null {
  try {
    const data = JSON.parse(text) as { app?: unknown; name?: unknown; songs?: unknown }
    if (data.app !== 'orbit' || !Array.isArray(data.songs)) return null
    const songs = data.songs.map(cleanSong).filter((song): song is Song => song !== null).slice(0, 500)
    const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 40) : 'Imported playlist'
    return songs.length > 0 ? { name, songs } : null
  } catch {
    return null
  }
}
