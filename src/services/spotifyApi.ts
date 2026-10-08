import { primaryArtist } from '../core/artist.ts'
import { rankByDuration } from '../core/rankByDuration.ts'
import type { Song } from '../core/types.ts'
import { ServiceError } from './http.ts'

const API = 'https://api.spotify.com/v1'

export type TokenSource = () => Promise<string>

export interface SpotifyAccount {
  name: string
  premium: boolean
}

async function call(token: TokenSource, path: string, init: RequestInit = {}, fetcher: typeof fetch = fetch, signal?: AbortSignal): Promise<Response> {
  let response: Response
  try {
    response = await fetcher(`${API}${path}`, {
      ...init,
      ...(signal ? { signal } : {}),
      headers: { authorization: `Bearer ${await token()}`, ...(init.body ? { 'content-type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new ServiceError('aborted', 'Request was cancelled')
    throw new ServiceError('network', 'Spotify could not be reached')
  }
  if (response.status === 429) throw new ServiceError('quota', 'Spotify is rate limiting requests')
  if (response.status === 403) throw new ServiceError('missing_key', 'This Spotify account is not allowed to use Orbit yet')
  if (!response.ok && response.status !== 204) throw new ServiceError('network', `Spotify answered ${response.status}`)
  return response
}

export async function fetchAccount(token: TokenSource, fetcher: typeof fetch = fetch): Promise<SpotifyAccount> {
  const data = (await (await call(token, '/me', {}, fetcher)).json()) as { display_name?: string; product?: string }
  return { name: data.display_name ?? 'Spotify listener', premium: data.product === 'premium' }
}

export function searchQuery(song: Song): string {
  const title = song.title.replace(/\s*[([].*?[)\]]/g, '').trim() || song.title
  return `track:${title} artist:${primaryArtist(song.artist)}`
}

export async function resolveSpotifyUris(song: Song, token: TokenSource, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<string[]> {
  const params = new URLSearchParams({ q: searchQuery(song), type: 'track', limit: '5' })
  const data = (await (await call(token, `/search?${params.toString()}`, {}, fetcher, signal)).json()) as {
    tracks?: { items?: { uri?: string; duration_ms?: number }[] }
  }
  const candidates = (data.tracks?.items ?? [])
    .filter((item): item is { uri: string; duration_ms?: number } => typeof item.uri === 'string')
    .map((item) => ({ id: item.uri, durationMs: item.duration_ms ?? 0 }))
  const ranked = rankByDuration(candidates, song.durationMs)
  if (ranked.length === 0) throw new ServiceError('not_found', 'Spotify has no match for this song')
  return ranked
}

export async function playOnDevice(token: TokenSource, deviceId: string, uri: string, fetcher: typeof fetch = fetch): Promise<void> {
  await call(token, `/me/player/play?device_id=${encodeURIComponent(deviceId)}`, { method: 'PUT', body: JSON.stringify({ uris: [uri] }) }, fetcher)
}
