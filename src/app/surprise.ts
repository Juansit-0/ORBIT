import type { Song } from '../core/types.ts'

export const SURPRISE_GENRES = ['Pop hits', 'Rock classics', 'Reggaeton', 'Salsa', 'Jazz standards', 'Hip hop', 'Indie rock', 'Electronic', 'Lo-fi beats', 'Bossa nova', 'K-pop', 'Funk', 'Cumbia', 'Soul classics']

export function pickSurprise(candidates: readonly Song[], avoid: ReadonlySet<string>, random: () => number = Math.random): Song | null {
  const pool = candidates.filter((song) => !avoid.has(song.id))
  if (pool.length === 0) return null
  return pool[Math.floor(random() * pool.length)] ?? null
}

export interface SurpriseSources {
  charts: () => readonly Song[] | null
  search: (term: string) => Promise<Song[]>
  avoid: ReadonlySet<string>
  random?: () => number
}

export async function surpriseSong(sources: SurpriseSources): Promise<Song | null> {
  const random = sources.random ?? Math.random
  const fromCharts = pickSurprise(sources.charts() ?? [], sources.avoid, random)
  if (fromCharts) return fromCharts
  const genre = SURPRISE_GENRES[Math.floor(random() * SURPRISE_GENRES.length)] as string
  return pickSurprise(await sources.search(genre), sources.avoid, random)
}
