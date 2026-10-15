import { searchSongs, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  return toResponse(await searchSongs(params.get('term') ?? '', fetch, params.get('by') === 'artist'), 3600)
}
