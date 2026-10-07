import { artistKey, primaryArtist } from '../core/artist.ts'
import { spreadShuffle } from '../core/spreadShuffle.ts'
import type { Song } from '../core/types.ts'
import { pickRadioSongs } from './radioPick.ts'

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
  const terms = new Set<string>()
  const artist = primaryArtist(top.artist)
  if (artist.toLowerCase() !== term.toLowerCase()) terms.add(artist)
  if (top.genre) terms.add(`${top.genre} hits`)
  const more = await Promise.all([...terms].map((extra) => search(extra).catch(() => [] as Song[])))
  const picked = pickRadioSongs([first, ...more], { ids: new Set(), keys: new Set() }, size)
  return spreadShuffle(picked, { artistOf: (song) => artistKey(song.artist), genreOf: (song) => song.genre, random })
}
