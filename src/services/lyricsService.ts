import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'

export interface LyricLine {
  timeMs: number
  text: string
}

export interface Lyrics {
  synced: LyricLine[]
  plain: string | null
  instrumental: boolean
}

const memory = new Map<string, Lyrics>()

export async function loadLyrics(song: Song, signal?: AbortSignal): Promise<Lyrics> {
  const cached = memory.get(song.id)
  if (cached) return cached
  const lyrics = await getJson<Lyrics>(
    '/api/lyrics',
    { title: song.title, artist: song.artist, album: song.album, durationMs: String(song.durationMs) },
    signal,
  )
  memory.set(song.id, lyrics)
  return lyrics
}

export function activeLineIndex(lines: LyricLine[], positionMs: number): number {
  let low = 0
  let high = lines.length - 1
  let answer = -1
  while (low <= high) {
    const mid = (low + high) >> 1
    if ((lines[mid] as LyricLine).timeMs <= positionMs) {
      answer = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return answer
}
