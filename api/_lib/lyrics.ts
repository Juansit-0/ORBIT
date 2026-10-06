import type { ApiResult } from './handlers.js'

export interface LyricLine {
  timeMs: number
  text: string
}

export interface LyricsPayload {
  synced: LyricLine[]
  plain: string | null
  instrumental: boolean
}

interface LrclibRecord {
  trackName?: string
  artistName?: string
  duration?: number
  instrumental?: boolean
  plainLyrics?: string | null
  syncedLyrics?: string | null
}

type Fetcher = typeof fetch

const LRCLIB = 'https://lrclib.net/api'
const HEADERS = { 'user-agent': 'Orbit music player (github.com/Juansit-0/ORBIT)' }
const cache = new Map<string, LyricsPayload>()

export function parseLrc(source: string): LyricLine[] {
  const lines: LyricLine[] = []
  for (const raw of source.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)]
    if (stamps.length === 0) continue
    const text = raw.replace(/\[[^\]]*\]/g, '').trim()
    for (const stamp of stamps) {
      const minutes = Number(stamp[1])
      const seconds = Number(stamp[2])
      const fraction = stamp[3] ?? '0'
      const millis = Number(fraction.padEnd(3, '0').slice(0, 3))
      lines.push({ timeMs: (minutes * 60 + seconds) * 1000 + millis, text })
    }
  }
  return lines.sort((a, b) => a.timeMs - b.timeMs)
}

export function toPayload(record: LrclibRecord): LyricsPayload {
  const synced = record.syncedLyrics ? parseLrc(record.syncedLyrics) : []
  const plain = record.plainLyrics?.trim() || null
  return { synced, plain, instrumental: Boolean(record.instrumental) }
}

function hasLyrics(payload: LyricsPayload): boolean {
  return payload.synced.length > 0 || payload.plain !== null || payload.instrumental
}

function closest(records: LrclibRecord[], durationSec: number): LrclibRecord | null {
  const withLyrics = records.filter((record) => record.syncedLyrics || record.plainLyrics || record.instrumental)
  if (withLyrics.length === 0) return null
  const synced = withLyrics.filter((record) => record.syncedLyrics)
  const pool = synced.length > 0 ? synced : withLyrics
  if (durationSec <= 0) return pool[0] ?? null
  return [...pool].sort((a, b) => Math.abs((a.duration ?? 0) - durationSec) - Math.abs((b.duration ?? 0) - durationSec))[0] ?? null
}

export async function fetchLyrics(
  params: { title: string; artist: string; album: string; durationMs: number },
  fetcher: Fetcher = fetch,
): Promise<ApiResult> {
  const title = params.title.trim()
  const artist = params.artist.trim()
  if (!title || !artist) return { status: 400, body: { error: 'missing_fields' } }
  const durationSec = Math.round(params.durationMs / 1000)
  const key = `${artist}::${title}::${durationSec}`.toLowerCase()
  const cached = cache.get(key)
  if (cached) return { status: 200, body: cached }
  try {
    const exact = new URL(`${LRCLIB}/get`)
    exact.search = new URLSearchParams({
      artist_name: artist,
      track_name: title,
      ...(params.album ? { album_name: params.album } : {}),
      ...(durationSec > 0 ? { duration: String(durationSec) } : {}),
    }).toString()
    const exactResponse = await fetcher(exact, { headers: HEADERS })
    if (exactResponse.ok) {
      const payload = toPayload((await exactResponse.json()) as LrclibRecord)
      if (hasLyrics(payload)) {
        cache.set(key, payload)
        return { status: 200, body: payload }
      }
    } else if (exactResponse.status !== 404) {
      return { status: 502, body: { error: 'upstream_error' } }
    }
    const search = new URL(`${LRCLIB}/search`)
    search.search = new URLSearchParams({ artist_name: artist, track_name: title }).toString()
    const searchResponse = await fetcher(search, { headers: HEADERS })
    if (!searchResponse.ok) return { status: 502, body: { error: 'upstream_error' } }
    const record = closest((await searchResponse.json()) as LrclibRecord[], durationSec)
    if (!record) return { status: 404, body: { error: 'not_found' } }
    const payload = toPayload(record)
    cache.set(key, payload)
    return { status: 200, body: payload }
  } catch {
    return { status: 502, body: { error: 'upstream_error' } }
  }
}

export function clearLyricsCache(): void {
  cache.clear()
}
