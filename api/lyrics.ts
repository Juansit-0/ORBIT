import { toResponse } from './_lib/handlers.js'
import { fetchLyrics } from './_lib/lyrics.js'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const result = await fetchLyrics({
    title: params.get('title') ?? '',
    artist: params.get('artist') ?? '',
    album: params.get('album') ?? '',
    durationMs: Number(params.get('durationMs') ?? 0) || 0,
  })
  return toResponse(result, 604800)
}
