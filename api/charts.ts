import { chartSongs, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const country = new URL(request.url).searchParams.get('country')
  return toResponse(await chartSongs(country), 21600)
}
