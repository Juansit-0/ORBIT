import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'
import { readJson, writeJson } from './storage.ts'

const CACHE_KEY = 'orbit:v1:videos'

function readCache(): Record<string, string> {
  return readJson<Record<string, string>>(CACHE_KEY) ?? {}
}

export function cachedVideoId(song: Song): string | undefined {
  return song.videoId ?? readCache()[song.id]
}

export async function resolveVideoId(song: Song, signal?: AbortSignal): Promise<string> {
  const cached = cachedVideoId(song)
  if (cached) return cached
  const { videoId } = await getJson<{ videoId: string }>(
    '/api/resolve',
    { title: song.title, artist: song.artist, durationMs: String(song.durationMs) },
    signal,
  )
  writeJson(CACHE_KEY, { ...readCache(), [song.id]: videoId })
  return videoId
}
