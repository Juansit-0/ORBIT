import { artistKey, artistNames, primaryArtist } from '../core/artist.ts'
import { spreadShuffle } from '../core/spreadShuffle.ts'
import type { Song } from '../core/types.ts'
import { pickRadioSongs, radioKey } from './radioPick.ts'

export const MIX_SIZE = 20

export type SongSearch = (term: string, by?: 'artist') => Promise<Song[]>

const MIN_ARTIST_SONGS = 3

export function mixName(seed: string): string {
  return `Mix · ${seed.trim().replace(/\s+/g, ' ')}`
}

export async function buildMix(seed: string, search: SongSearch, random: () => number = Math.random, size = MIX_SIZE): Promise<Song[]> {
  const term = seed.trim()
  if (term.length < 2) return []
  const wanted = term.toLowerCase()
  const byArtist = (await search(term, 'artist').catch(() => [] as Song[])).filter((song) => artistNames(song.artist).includes(wanted))
  let picked: Song[]
  let top: Song | undefined
  if (byArtist.length >= MIN_ARTIST_SONGS) {
    top = byArtist[0]
    picked = pickRadioSongs([byArtist], { ids: new Set(), keys: new Set() }, size)
  } else {
    const first = await search(term)
    top = first[0]
    if (!top) return []
    const artist = primaryArtist(top.artist)
    const close = artist.toLowerCase() === wanted ? [] : await search(artist).catch(() => [] as Song[])
    picked = pickRadioSongs([first, close], { ids: new Set(), keys: new Set() }, size)
  }
  const genreName = top?.genre
  if (picked.length < size && genreName) {
    const genre = await search(`${genreName} hits`).catch(() => [] as Song[])
    const fill = pickRadioSongs([genre], { ids: new Set(picked.map((song) => song.id)), keys: new Set(picked.map(radioKey)) }, size - picked.length)
    picked.push(...fill)
  }
  return spreadShuffle(picked, { artistOf: (song) => artistKey(song.artist), genreOf: (song) => song.genre, random })
}
