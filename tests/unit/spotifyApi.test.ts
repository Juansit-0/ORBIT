import { describe, expect, it, vi } from 'vitest'
import { fetchAccount, playOnDevice, resolveSpotifyUris, searchQuery } from '../../src/services/spotifyApi.ts'
import { song } from './helpers.ts'

const token = async () => 'tok'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

const getLucky = { ...song('1'), title: 'Get Lucky (Radio Edit)', artist: 'Daft Punk feat. Pharrell Williams', durationMs: 248000 }

describe('spotify api', () => {
  it('searches by clean title and main artist and ranks by length', async () => {
    expect(searchQuery(getLucky)).toBe('track:Get Lucky artist:Daft Punk')
    const fetcher = vi.fn().mockResolvedValue(json({ tracks: { items: [
      { uri: 'spotify:track:long', duration_ms: 369000 },
      { uri: 'spotify:track:radio', duration_ms: 248500 },
    ] } }))
    expect(await resolveSpotifyUris(getLucky, token, undefined, fetcher)).toEqual(['spotify:track:radio', 'spotify:track:long'])
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({ authorization: 'Bearer tok' })
  })

  it('reports a missing match, a blocked account and rate limits', async () => {
    await expect(resolveSpotifyUris(getLucky, token, undefined, vi.fn().mockResolvedValue(json({ tracks: { items: [] } })))).rejects.toMatchObject({ kind: 'not_found' })
    await expect(resolveSpotifyUris(getLucky, token, undefined, vi.fn().mockResolvedValue(json({}, 403)))).rejects.toMatchObject({ kind: 'missing_key' })
    await expect(resolveSpotifyUris(getLucky, token, undefined, vi.fn().mockResolvedValue(json({}, 429)))).rejects.toMatchObject({ kind: 'quota' })
  })

  it('reads whether the account is Premium', async () => {
    expect(await fetchAccount(token, vi.fn().mockResolvedValue(json({ display_name: 'Juan', product: 'premium' })))).toEqual({ name: 'Juan', premium: true })
    expect((await fetchAccount(token, vi.fn().mockResolvedValue(json({ product: 'free' })))).premium).toBe(false)
  })

  it('starts a track on the Orbit device', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    await playOnDevice(token, 'dev 1', 'spotify:track:x', fetcher)
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://api.spotify.com/v1/me/player/play?device_id=dev%201')
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ uris: ['spotify:track:x'] }) })
  })
})
