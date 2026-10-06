import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'
import { readJson, writeJson } from './storage.ts'

const CACHE_KEY = 'orbit:v1:videos'

function readCache(): Record<string, string | string[]> {
  return readJson<Record<string, string | string[]>>(CACHE_KEY) ?? {}
}

function cached(song: Song): string[] {
  const entry = readCache()[song.id]
  if (!entry) return []
  return Array.isArray(entry) ? entry.filter((id) => typeof id === 'string') : []
}

export async function resolveVideoIds(song: Song, signal?: AbortSignal): Promise<string[]> {
  const known = cached(song)
  if (known.length > 0) return known
  const { videoId, candidates } = await getJson<{ videoId: string; candidates?: string[] }>(
    '/api/resolve',
    { title: song.title, artist: song.artist, durationMs: String(song.durationMs) },
    signal,
  )
  const ids = candidates && candidates.length > 0 ? candidates : [videoId]
  writeJson(CACHE_KEY, { ...readCache(), [song.id]: ids })
  return ids
}
