import { artistKey, primaryArtist } from '../core/artist.ts'
import { spreadShuffle } from '../core/spreadShuffle.ts'
import type { Song } from '../core/types.ts'
import { pickRadioSongs, radioKey } from './radioPick.ts'

export const MIX_SIZE = 20

export type SongSearch = (term: string) => Promise<Song[]>

export function mixName(seed: string): string {
  return `Mix · ${seed.trim().replace(/\s+/g, ' ')}`
}

export async function buildMix(seed: string, search: SongSearch, random: () => number = Math.random, size = MIX_SIZE): Promise<Song[]> {
  const term = seed.trim()
  if (term.length < 2) return []
  const first = await search(term)
  const top = first[0]
  if (!top) return []
  const artist = primaryArtist(top.artist)
  const sameArtist = artist.toLowerCase() === term.toLowerCase()
  const close = sameArtist ? [] : await search(artist).catch(() => [] as Song[])
  const picked = pickRadioSongs([first, close], { ids: new Set(), keys: new Set() }, size)
  if (picked.length < size && top.genre) {
    const genre = await search(`${top.genre} hits`).catch(() => [] as Song[])
    const fill = pickRadioSongs([genre], { ids: new Set(picked.map((song) => song.id)), keys: new Set(picked.map(radioKey)) }, size - picked.length)
    picked.push(...fill)
  }
  return spreadShuffle(picked, { artistOf: (song) => artistKey(song.artist), genreOf: (song) => song.genre, random })
}
