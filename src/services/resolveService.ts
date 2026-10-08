import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'
import { readJson, writeJson } from './storage.ts'

export type Flavor = 'video' | 'music'

function cacheKey(flavor: Flavor): string {
  return flavor === 'music' ? 'orbit:v1:videos-music' : 'orbit:v1:videos'
}

function readCache(flavor: Flavor): Record<string, string | string[]> {
  return readJson<Record<string, string | string[]>>(cacheKey(flavor)) ?? {}
}

function cached(song: Song, flavor: Flavor): string[] {
  const entry = readCache(flavor)[song.id]
  if (!entry) return []
  return Array.isArray(entry) ? entry.filter((id) => typeof id === 'string') : []
}

export async function resolveVideoIds(song: Song, signal?: AbortSignal, flavor: Flavor = 'video'): Promise<string[]> {
  const known = cached(song, flavor)
  if (known.length > 0) return known
  const { videoId, candidates } = await getJson<{ videoId: string; candidates?: string[] }>(
    '/api/resolve',
    { title: song.title, artist: song.artist, durationMs: String(song.durationMs), ...(flavor === 'music' ? { flavor } : {}) },
    signal,
  )
  const ids = candidates && candidates.length > 0 ? candidates : [videoId]
  writeJson(cacheKey(flavor), { ...readCache(flavor), [song.id]: ids })
  return ids
}
