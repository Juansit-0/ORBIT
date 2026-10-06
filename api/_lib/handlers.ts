export interface ApiSong {
  id: string
  title: string
  artist: string
  album: string
  artworkUrl: string
  durationMs: number
  previewUrl?: string
}

export interface ApiResult {
  status: number
  body: unknown
}

type Fetcher = typeof fetch

interface ItunesTrack {
  trackId?: number
  trackName?: string
  artistName?: string
  collectionName?: string
  artworkUrl100?: string
  trackTimeMillis?: number
  previewUrl?: string
  kind?: string
}

const ITUNES_URL = 'https://itunes.apple.com/search'
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'
const resolveCache = new Map<string, string[]>()

export function mapItunesTrack(track: ItunesTrack): ApiSong | null {
  if (!track.trackId || !track.trackName || !track.artistName) return null
  const song: ApiSong = {
    id: String(track.trackId),
    title: track.trackName,
    artist: track.artistName,
    album: track.collectionName ?? '',
    artworkUrl: (track.artworkUrl100 ?? '').replace(/\/\d+x\d+bb\./, '/600x600bb.'),
    durationMs: track.trackTimeMillis ?? 0,
  }
  if (track.previewUrl) song.previewUrl = track.previewUrl
  return song
}

export async function searchSongs(term: string, fetcher: Fetcher = fetch): Promise<ApiResult> {
  const query = term.trim()
  if (query.length < 2) return { status: 400, body: { error: 'query_too_short' } }
  if (query.length > 120) return { status: 400, body: { error: 'query_too_long' } }
  const url = new URL(ITUNES_URL)
  url.search = new URLSearchParams({ term: query, media: 'music', entity: 'song', limit: '25' }).toString()
  try {
    const response = await fetcher(url)
    if (!response.ok) return { status: 502, body: { error: 'upstream_error' } }
    const data = (await response.json()) as { results?: ItunesTrack[] }
    const songs = (data.results ?? [])
      .map(mapItunesTrack)
      .filter((song): song is ApiSong => song !== null)
    return { status: 200, body: { songs } }
  } catch {
    return { status: 502, body: { error: 'upstream_error' } }
  }
}

export function parseIsoDuration(value: string): number {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value)
  if (!match) return 0
  const [, days, hours, minutes, seconds] = match.map((part) => Number(part ?? 0))
  return ((((days ?? 0) * 24 + (hours ?? 0)) * 60 + (minutes ?? 0)) * 60 + (seconds ?? 0)) * 1000
}

export function rankVideos(candidates: { id: string; durationMs: number }[], targetMs: number): string[] {
  const best = pickClosestVideo(candidates, targetMs)
  if (!best) return []
  const rest = candidates
    .filter((candidate) => candidate.id !== best)
    .sort((a, b) =>
      targetMs > 0 ? Math.abs(a.durationMs - targetMs) - Math.abs(b.durationMs - targetMs) : 0,
    )
    .map((candidate) => candidate.id)
  return [best, ...rest]
}

export function pickClosestVideo(
  candidates: { id: string; durationMs: number }[],
  targetMs: number,
): string | null {
  if (candidates.length === 0) return null
  if (targetMs <= 0) return candidates[0]?.id ?? null
  const ranked = [...candidates].sort(
    (a, b) => Math.abs(a.durationMs - targetMs) - Math.abs(b.durationMs - targetMs),
  )
  const best = ranked[0]
  if (best && Math.abs(best.durationMs - targetMs) <= Math.max(20000, targetMs * 0.15)) return best.id
  return candidates[0]?.id ?? null
}

async function youtubeError(response: Response): Promise<ApiResult> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: { errors?: { reason?: string }[] }
  }
  const reason = data.error?.errors?.[0]?.reason ?? ''
  if (response.status === 403 && /quota|rateLimit/i.test(reason)) {
    return { status: 429, body: { error: 'quota' } }
  }
  return { status: 502, body: { error: 'upstream_error' } }
}

export async function resolveVideo(
  params: { title: string; artist: string; durationMs: number },
  apiKey: string | undefined,
  fetcher: Fetcher = fetch,
): Promise<ApiResult> {
  const title = params.title.trim()
  const artist = params.artist.trim()
  if (!title || !artist) return { status: 400, body: { error: 'missing_fields' } }
  if (!apiKey) return { status: 503, body: { error: 'missing_key' } }
  const cacheKey = `${artist}::${title}`.toLowerCase()
  const cached = resolveCache.get(cacheKey)
  if (cached) return { status: 200, body: { videoId: cached[0], candidates: cached } }
  try {
    const searchUrl = new URL(YOUTUBE_SEARCH_URL)
    searchUrl.search = new URLSearchParams({
      part: 'id',
      type: 'video',
      videoEmbeddable: 'true',
      videoCategoryId: '10',
      maxResults: '5',
      q: `${artist} ${title} audio`,
      key: apiKey,
    }).toString()
    const searchResponse = await fetcher(searchUrl)
    if (!searchResponse.ok) return youtubeError(searchResponse)
    const searchData = (await searchResponse.json()) as { items?: { id?: { videoId?: string } }[] }
    const ids = (searchData.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id))
    if (ids.length === 0) return { status: 404, body: { error: 'not_found' } }
    const videosUrl = new URL(YOUTUBE_VIDEOS_URL)
    videosUrl.search = new URLSearchParams({ part: 'contentDetails', id: ids.join(','), key: apiKey }).toString()
    const videosResponse = await fetcher(videosUrl)
    const videosData = videosResponse.ok
      ? ((await videosResponse.json()) as { items?: { id: string; contentDetails?: { duration?: string } }[] })
      : { items: [] }
    const candidates = ids.map((id) => {
      const details = videosData.items?.find((item) => item.id === id)
      return { id, durationMs: parseIsoDuration(details?.contentDetails?.duration ?? '') }
    })
    const ranked = rankVideos(candidates, params.durationMs)
    if (ranked.length === 0) return { status: 404, body: { error: 'not_found' } }
    resolveCache.set(cacheKey, ranked)
    return { status: 200, body: { videoId: ranked[0], candidates: ranked } }
  } catch {
    return { status: 502, body: { error: 'upstream_error' } }
  }
}

export function clearResolveCache(): void {
  resolveCache.clear()
}

export function toResponse(result: ApiResult, cacheSeconds = 0): Response {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (result.status === 200 && cacheSeconds > 0) {
    headers['cache-control'] = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers })
}
