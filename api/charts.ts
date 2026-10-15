import { chartLimit, chartSongs, toResponse } from './_lib/handlers.js'

export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams
  return toResponse(await chartSongs(params.get('country'), fetch, chartLimit(params.get('limit'))), 21600)
}
