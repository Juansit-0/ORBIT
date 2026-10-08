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
        primaryGenreName: 'Pop',
      }),
    ).toEqual({
      genre: 'Pop',
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

  it('asks for the official audio when the music flavor is used, cached apart from videos', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ items: [
        { id: { videoId: 'clip' }, snippet: { channelTitle: 'DaftPunkVEVO', title: 'Get Lucky (Official Video)' } },
        { id: { videoId: 'topic' }, snippet: { channelTitle: 'Daft Punk - Topic', title: 'Get Lucky' } },
      ] }))
      .mockResolvedValueOnce(jsonResponse({ items: [
        { id: 'clip', contentDetails: { duration: 'PT4M8S' } },
        { id: 'topic', contentDetails: { duration: 'PT4M9S' } },
      ] }))
    const result = await resolveVideo({ ...params, flavor: 'music' }, 'k', fetcher)
    expect(result.body).toEqual({ videoId: 'topic', candidates: ['topic', 'clip'] })
    const url = String(fetcher.mock.calls[0]?.[0])
    expect(url).toContain('part=snippet')
    expect(url).toContain('topic')
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

import { lookupSongs } from '../../api/_lib/handlers.ts'

describe('lookupSongs', () => {
  it('returns songs in the requested order and skips missing ones', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        results: [
          { wrapperType: 'track', trackId: 2, trackName: 'Two', artistName: 'B' },
          { wrapperType: 'track', trackId: 1, trackName: 'One', artistName: 'A' },
        ],
      }),
    )
    const result = await lookupSongs('1.2.3', fetcher)
    expect((result.body as { songs: { id: string }[] }).songs.map((s) => s.id)).toEqual(['1', '2'])
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('id=1%2C2%2C3')
  })

  it('validates ids and reports upstream errors', async () => {
    expect((await lookupSongs('abc', vi.fn())).status).toBe(400)
    expect((await lookupSongs('1', vi.fn().mockResolvedValue(jsonResponse({}, 500)))).status).toBe(502)
  })
})

import { chartCountry, chartSongs } from '../../api/_lib/handlers.ts'

describe('chartSongs', () => {
  const feed = (ids: string[]) => jsonResponse({ feed: { results: ids.map((id) => ({ id })) } })
  const lookup = () => jsonResponse({
    results: [
      { wrapperType: 'track', trackId: 7, trackName: 'Seven', artistName: 'G' },
      { wrapperType: 'track', trackId: 5, trackName: 'Five', artistName: 'E' },
    ],
  })

  it('reads the country chart and looks the songs up in chart order', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(feed(['5', '7', 'x'])).mockResolvedValueOnce(lookup())
    const result = await chartSongs('CO', fetcher)
    expect(result.status).toBe(200)
    expect((result.body as { songs: { id: string }[] }).songs.map((s) => s.id)).toEqual(['5', '7'])
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('/api/v2/co/music/most-played/25/songs.json')
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('id=5%2C7')
  })

  it('falls back to the US chart when a country has none', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(jsonResponse({}, 404)).mockResolvedValueOnce(feed(['7'])).mockResolvedValueOnce(lookup())
    const result = await chartSongs('zz', fetcher)
    expect(result.status).toBe(200)
    expect(String(fetcher.mock.calls[1]?.[0])).toContain('/api/v2/us/')
  })

  it('reports upstream errors', async () => {
    expect((await chartSongs('us', vi.fn().mockResolvedValue(jsonResponse({}, 500)))).status).toBe(502)
    expect((await chartSongs('us', vi.fn().mockRejectedValue(new Error('offline')))).status).toBe(502)
  })

  it('accepts only two letter countries', () => {
    expect(chartCountry('es')).toBe('es')
    expect(chartCountry('es-CO')).toBe('us')
    expect(chartCountry(null)).toBe('us')
  })
})

import { rankMusicVideos } from '../../api/_lib/handlers.ts'

describe('rankMusicVideos', () => {
  it('prefers the artist topic channel, then official audio, close to the song length', () => {
    const ranked = rankMusicVideos(
      [
        { id: 'clip', durationMs: 369500, channel: 'DaftPunkVEVO', title: 'Daft Punk - Get Lucky (Official Video)' },
        { id: 'audio', durationMs: 368000, channel: 'Daft Punk', title: 'Get Lucky (Official Audio)' },
        { id: 'topic', durationMs: 370000, channel: 'Daft Punk - Topic', title: 'Get Lucky' },
        { id: 'short', durationMs: 120000, channel: 'Random - Topic', title: 'Get Lucky cover' },
      ],
      369000,
    )
    expect(ranked).toEqual(['topic', 'audio', 'clip', 'short'])
  })

  it('falls back to the length when nothing is marked as audio', () => {
    expect(rankMusicVideos([
      { id: 'a', durationMs: 300000, channel: 'x', title: 'one' },
      { id: 'b', durationMs: 200000, channel: 'y', title: 'two' },
    ], 205000)).toEqual(['b', 'a'])
  })
})
