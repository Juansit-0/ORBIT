import { primaryArtist } from '../core/artist.ts'
import type { Song } from '../core/types.ts'

export { primaryArtist }

function key(song: Song): string {
  return `${song.title.toLowerCase().replace(/\s*[([].*?[)\]]/g, '').trim()}::${primaryArtist(song.artist).toLowerCase()}`
}

export function pickRadioSongs(pools: Song[][], exclude: { ids: Set<string>; keys: Set<string> }, limit: number): Song[] {
  const picked: Song[] = []
  const seen = new Set<string>()
  const longest = Math.max(0, ...pools.map((pool) => pool.length))
  for (let i = 0; i < longest && picked.length < limit; i++) {
    for (const pool of pools) {
      const song = pool[i]
      if (!song || picked.length >= limit) continue
      const songKey = key(song)
      if (exclude.ids.has(song.id) || exclude.keys.has(songKey) || seen.has(songKey)) continue
      seen.add(songKey)
      picked.push(song)
    }
  }
  return picked
}

export function radioKey(song: Song): string {
  return key(song)
}
