import { lookupSongs, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const ids = new URL(request.url).searchParams.get('ids') ?? ''
  return toResponse(await lookupSongs(ids), 86400)
}
