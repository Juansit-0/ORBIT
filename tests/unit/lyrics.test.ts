import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLyricsCache, fetchLyrics, parseLrc, toPayload } from '../../api/_lib/lyrics.ts'
import { activeLineIndex } from '../../src/services/lyricsService.ts'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

describe('parseLrc', () => {
  it('parses timestamps with two and three digit fractions', () => {
    expect(parseLrc('[00:01.50] One\n[01:02.123] Two\n[ar:Artist]\nplain line')).toEqual([
      { timeMs: 1500, text: 'One' },
      { timeMs: 62123, text: 'Two' },
    ])
  })

  it('expands repeated timestamps and sorts them', () => {
    expect(parseLrc('[00:30.00][00:10.00] Chorus\n[00:20.00] Verse')).toEqual([
      { timeMs: 10000, text: 'Chorus' },
      { timeMs: 20000, text: 'Verse' },
      { timeMs: 30000, text: 'Chorus' },
    ])
  })

  it('keeps empty lines as breaks', () => {
    expect(parseLrc('[00:05.00]')).toEqual([{ timeMs: 5000, text: '' }])
  })
})

describe('toPayload', () => {
  it('prefers synced lyrics and keeps plain text', () => {
    expect(toPayload({ syncedLyrics: '[00:01.00] a', plainLyrics: ' a ' })).toEqual({
      synced: [{ timeMs: 1000, text: 'a' }],
      plain: 'a',
      instrumental: false,
    })
  })
})

describe('fetchLyrics', () => {
  const params = { title: 'Dreams', artist: 'Fleetwood Mac', album: 'Rumours', durationMs: 254000 }

  beforeEach(() => clearLyricsCache())

  it('requires title and artist', async () => {
    expect((await fetchLyrics({ ...params, artist: '' }, vi.fn())).status).toBe(400)
  })

  it('returns the exact match and caches it', async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ syncedLyrics: '[00:01.00] Now here you go again' }))
    expect((await fetchLyrics(params, fetcher)).status).toBe(200)
    expect((await fetchLyrics(params, fetcher)).status).toBe(200)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('duration=254')
  })

  it('falls back to search and picks the closest synced duration', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(json({ code: 404 }, 404))
      .mockResolvedValueOnce(
        json([
          { duration: 400, syncedLyrics: '[00:01.00] far' },
          { duration: 255, syncedLyrics: '[00:01.00] near' },
          { duration: 254, plainLyrics: 'plain only' },
        ]),
      )
    const result = await fetchLyrics(params, fetcher)
    expect((result.body as { synced: { text: string }[] }).synced[0]?.text).toBe('near')
  })

  it('reports not found and upstream errors', async () => {
    const empty = vi.fn().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json([]))
    expect((await fetchLyrics(params, empty)).status).toBe(404)
    expect((await fetchLyrics(params, vi.fn().mockResolvedValue(json({}, 500)))).status).toBe(502)
    expect((await fetchLyrics(params, vi.fn().mockRejectedValue(new Error('x')))).status).toBe(502)
  })
})

describe('activeLineIndex', () => {
  const lines = [0, 5000, 9000, 15000].map((timeMs) => ({ timeMs, text: String(timeMs) }))

  it('finds the last line that started', () => {
    expect(activeLineIndex(lines, -1)).toBe(-1)
    expect(activeLineIndex(lines, 0)).toBe(0)
    expect(activeLineIndex(lines, 8999)).toBe(1)
    expect(activeLineIndex(lines, 9000)).toBe(2)
    expect(activeLineIndex(lines, 999999)).toBe(3)
    expect(activeLineIndex([], 10)).toBe(-1)
  })
})
