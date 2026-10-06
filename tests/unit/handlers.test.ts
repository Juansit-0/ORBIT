import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearResolveCache,
  mapItunesTrack,
  parseIsoDuration,
  pickClosestVideo,
  resolveVideo,
  searchSongs,
} from '../../api/_lib/handlers.ts'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('mapItunesTrack', () => {
  it('maps fields and upgrades artwork resolution', () => {
    expect(
      mapItunesTrack({
        trackId: 1,
        trackName: 'Song',
        artistName: 'Artist',
        collectionName: 'Album',
        artworkUrl100: 'https://a.mzstatic.com/x/100x100bb.jpg',
        trackTimeMillis: 200000,
        previewUrl: 'https://p.m4a',
      }),
    ).toEqual({
      id: '1',
      title: 'Song',
      artist: 'Artist',
      album: 'Album',
      artworkUrl: 'https://a.mzstatic.com/x/600x600bb.jpg',
      durationMs: 200000,
      previewUrl: 'https://p.m4a',
    })
  })

  it('discards incomplete tracks', () => {
    expect(mapItunesTrack({ trackName: 'No id' })).toBeNull()
  })
})

describe('searchSongs', () => {
  it('rejects short queries without calling upstream', async () => {
    const fetcher = vi.fn()
    expect((await searchSongs(' a ', fetcher)).status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('returns mapped songs', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ results: [{ trackId: 5, trackName: 'T', artistName: 'A' }, { kind: 'x' }] }),
    )
    const result = await searchSongs('daft punk', fetcher)
    expect(result.status).toBe(200)
    expect((result.body as { songs: unknown[] }).songs).toHaveLength(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('term=daft+punk')
  })

  it('reports upstream failures', async () => {
    expect((await searchSongs('abc', vi.fn().mockResolvedValue(jsonResponse({}, 500)))).status).toBe(502)
    expect((await searchSongs('abc', vi.fn().mockRejectedValue(new Error('down')))).status).toBe(502)
  })
})

describe('parseIsoDuration', () => {
  it.each([
    ['PT3M20S', 200000],
    ['PT1H2M3S', 3723000],
    ['PT45S', 45000],
    ['P1DT1S', 86401000],
    ['bad', 0],
  ])('parses %s', (value, expected) => {
    expect(parseIsoDuration(value)).toBe(expected)
  })
})

describe('pickClosestVideo', () => {
  it('prefers the candidate closest to the song length', () => {
    expect(
      pickClosestVideo(
        [
          { id: 'long', durationMs: 600000 },
          { id: 'match', durationMs: 201000 },
        ],
        200000,
      ),
    ).toBe('match')
  })

  it('falls back to the first result when nothing is close', () => {
    expect(pickClosestVideo([{ id: 'first', durationMs: 10 }, { id: 'b', durationMs: 20 }], 200000)).toBe('first')
  })

  it('handles empty input and unknown length', () => {
    expect(pickClosestVideo([], 1)).toBeNull()
    expect(pickClosestVideo([{ id: 'a', durationMs: 1 }], 0)).toBe('a')
  })
})

describe('resolveVideo', () => {
  const params = { title: 'Get Lucky', artist: 'Daft Punk', durationMs: 248000 }

  beforeEach(() => clearResolveCache())

  it('requires a key and fields', async () => {
    expect((await resolveVideo(params, undefined, vi.fn())).status).toBe(503)
    expect((await resolveVideo({ ...params, title: ' ' }, 'k', vi.fn())).status).toBe(400)
  })

  it('resolves and caches the best match', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [{ id: { videoId: 'a' } }, { id: { videoId: 'b' } }] }))
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: 'a', contentDetails: { duration: 'PT10M' } },
            { id: 'b', contentDetails: { duration: 'PT4M9S' } },
          ],
        }),
      )
    expect((await resolveVideo(params, 'k', fetcher)).body).toEqual({ videoId: 'b', candidates: ['b', 'a'] })
    expect((await resolveVideo(params, 'k', fetcher)).body).toEqual({ videoId: 'b', candidates: ['b', 'a'] })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('maps quota errors to 429', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403))
    expect((await resolveVideo(params, 'k', fetcher)).status).toBe(429)
  })

  it('returns 404 when nothing is found', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ items: [] }))
    expect((await resolveVideo(params, 'k', fetcher)).status).toBe(404)
  })

  it('returns 502 on network failure', async () => {
    expect((await resolveVideo(params, 'k', vi.fn().mockRejectedValue(new Error('x')))).status).toBe(502)
  })
})
