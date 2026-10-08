import { resolveVideo, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  const result = await resolveVideo(
    {
      title: params.get('title') ?? '',
      artist: params.get('artist') ?? '',
      durationMs: Number(params.get('durationMs') ?? 0) || 0,
      flavor: params.get('flavor') === 'music' ? 'music' : 'video',
    },
    process.env.YOUTUBE_API_KEY,
  )
  return toResponse(result, 86400)
}
