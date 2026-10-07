import { describe, expect, it, vi } from 'vitest'
import { buildMix, mixName } from '../../src/app/mixMaker.ts'
import type { Song } from '../../src/core/types.ts'
import { song } from './helpers.ts'

function track(id: string, artist: string, genre = 'Pop'): Song {
  return { ...song(id), title: `Song ${id}`, artist, genre }
}

describe('buildMix', () => {
  it('blends the seed results with the artist and genre and keeps artists apart', async () => {
    const pools: Record<string, Song[]> = {
      'blinding lights': [track('1', 'The Weeknd'), track('2', 'The Weeknd'), track('3', 'Dua Lipa')],
      'The Weeknd': [track('4', 'The Weeknd'), track('5', 'The Weeknd feat. Daft Punk'), track('2', 'The Weeknd')],
      'Pop hits': [track('6', 'Harry Styles'), track('7', 'Doja Cat'), track('8', 'Adele')],
    }
    const search = vi.fn(async (term: string) => pools[term] ?? [])
    const mix = await buildMix('blinding lights', search, () => 0.3)
    expect(search).toHaveBeenCalledWith('The Weeknd')
    expect(search).toHaveBeenCalledWith('Pop hits')
    expect(new Set(mix.map((s) => s.id)).size).toBe(mix.length)
    expect(mix.map((s) => s.id).sort()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8'])
    const artists = mix.map((s) => s.artist.split(' feat.')[0])
    for (let i = 1; i < artists.length; i++) {
      if (artists[i] === 'The Weeknd') expect(artists[i - 1]).not.toBe('The Weeknd')
    }
  })

  it('keeps at most the mix size', async () => {
    const many = Array.from({ length: 40 }, (_, i) => track(String(i), `Artist ${i}`))
    const mix = await buildMix('anything', async () => many, Math.random, 20)
    expect(mix).toHaveLength(20)
  })

  it('returns nothing for a short seed or no results and survives a failing extra search', async () => {
    expect(await buildMix(' a ', vi.fn())).toEqual([])
    expect(await buildMix('nothing', async () => [])).toEqual([])
    const search = vi.fn(async (term: string) => {
      if (term === 'seed') return [track('1', 'Solo', 'Rock')]
      throw new Error('offline')
    })
    expect((await buildMix('seed', search)).map((s) => s.id)).toEqual(['1'])
  })
})

describe('mixName', () => {
  it('names the playlist after the seed', () => {
    expect(mixName('  daft   punk ')).toBe('Mix · daft punk')
  })
})
