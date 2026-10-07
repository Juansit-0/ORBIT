import { describe, expect, it } from 'vitest'
import { fisherYates, insertionSlots, spreadShuffle } from '../../src/core/spreadShuffle.ts'

interface Track {
  id: number
  artist: string
  genre?: string
}

function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function feasible(tracks: Track[], after: Track | null): boolean {
  const counts = new Map<string, number>()
  for (const track of tracks) counts.set(track.artist, (counts.get(track.artist) ?? 0) + 1)
  for (const [artist, count] of counts) {
    const limit = Math.ceil(tracks.length / 2) - (after && after.artist === artist && tracks.length % 2 === 1 ? 1 : 0)
    if (count > limit) return false
  }
  return true
}

function clashes(order: Track[], after: Track | null): number {
  let total = 0
  let previous = after
  for (const track of order) {
    if (previous && previous.artist === track.artist) total++
    previous = track
  }
  return total
}

const artistOf = (track: Track) => track.artist
const genreOf = (track: Track) => track.genre

describe('spreadShuffle', () => {
  it('keeps every item exactly once', () => {
    const tracks = Array.from({ length: 12 }, (_, id) => ({ id, artist: `a${id % 4}` }))
    const order = spreadShuffle(tracks, { artistOf, random: seeded(3) })
    expect(order.map((track) => track.id).sort((a, b) => a - b)).toEqual(tracks.map((track) => track.id))
  })

  it('never puts the same artist back to back when that is possible', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const random = seeded(seed)
      const size = 2 + Math.floor(random() * 12)
      const artists = 1 + Math.floor(random() * 5)
      const tracks = Array.from({ length: size }, (_, id) => ({ id, artist: `a${Math.floor(random() * artists)}` }))
      const after = random() < 0.5 ? { id: -1, artist: `a${Math.floor(random() * artists)}` } : null
      const order = spreadShuffle(tracks, { artistOf, random, after })
      if (feasible(tracks, after)) expect(clashes(order, after), `seed ${seed}`).toBe(0)
      expect(order).toHaveLength(tracks.length)
    }
  })

  it('prefers a different genre after each song', () => {
    const tracks: Track[] = [
      { id: 1, artist: 'a', genre: 'pop' },
      { id: 2, artist: 'b', genre: 'pop' },
      { id: 3, artist: 'c', genre: 'rock' },
      { id: 4, artist: 'd', genre: 'rock' },
    ]
    for (let seed = 1; seed <= 50; seed++) {
      const order = spreadShuffle(tracks, { artistOf, genreOf, random: seeded(seed) })
      for (let i = 1; i < order.length; i++) expect(order[i]?.genre).not.toBe(order[i - 1]?.genre)
    }
  })

  it('still shuffles when one artist fills the whole list', () => {
    const tracks = Array.from({ length: 5 }, (_, id) => ({ id, artist: 'solo' }))
    expect(spreadShuffle(tracks, { artistOf, random: seeded(9) })).toHaveLength(5)
  })

  it('changes with the random source', () => {
    const tracks = Array.from({ length: 10 }, (_, id) => ({ id, artist: `a${id}` }))
    const one = spreadShuffle(tracks, { artistOf, random: seeded(1) }).map((track) => track.id)
    const two = spreadShuffle(tracks, { artistOf, random: seeded(2) }).map((track) => track.id)
    expect(one).not.toEqual(two)
  })
})

describe('fisherYates', () => {
  it('returns a permutation', () => {
    expect(fisherYates([1, 2, 3, 4], seeded(5)).sort()).toEqual([1, 2, 3, 4])
  })
})

describe('insertionSlots', () => {
  it('lists the gaps where the artist does not touch itself', () => {
    const order = [{ id: 1, artist: 'a' }, { id: 2, artist: 'b' }, { id: 3, artist: 'a' }]
    expect(insertionSlots(order, 1, { id: 9, artist: 'a' }, artistOf)).toEqual([])
    expect(insertionSlots(order, 1, { id: 9, artist: 'b' }, artistOf)).toEqual([3])
    expect(insertionSlots(order, 0, { id: 9, artist: 'c' }, artistOf)).toEqual([0, 1, 2, 3])
  })
})
