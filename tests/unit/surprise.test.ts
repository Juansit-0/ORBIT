import { describe, expect, it, vi } from 'vitest'
import { pickSurprise, SURPRISE_GENRES, surpriseSong } from '../../src/app/surprise.ts'
import { song } from './helpers.ts'

const charts = ['a', 'b', 'c'].map((id) => song(id))

describe('pickSurprise', () => {
  it('picks a random song that is not avoided', () => {
    expect(pickSurprise(charts, new Set(['a']), () => 0)?.id).toBe('b')
    expect(pickSurprise(charts, new Set(['a']), () => 0.99)?.id).toBe('c')
    expect(pickSurprise(charts, new Set(['a', 'b', 'c']))).toBeNull()
    expect(pickSurprise([], new Set())).toBeNull()
  })
})

describe('surpriseSong', () => {
  it('prefers the charts', async () => {
    const search = vi.fn()
    const picked = await surpriseSong({ charts: () => charts, search, avoid: new Set(), random: () => 0.5 })
    expect(picked?.id).toBe('b')
    expect(search).not.toHaveBeenCalled()
  })

  it('searches a random genre when the charts are missing or all known', async () => {
    const search = vi.fn(async () => [song('x')])
    const picked = await surpriseSong({ charts: () => charts, search, avoid: new Set(['a', 'b', 'c']), random: () => 0 })
    expect(search).toHaveBeenCalledWith(SURPRISE_GENRES[0])
    expect(picked?.id).toBe('x')
    expect(await surpriseSong({ charts: () => null, search: async () => [], avoid: new Set() })).toBeNull()
  })
})
