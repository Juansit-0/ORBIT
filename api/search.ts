import { searchSongs, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const term = new URL(request.url).searchParams.get('term') ?? ''
  return toResponse(await searchSongs(term), 3600)
}
