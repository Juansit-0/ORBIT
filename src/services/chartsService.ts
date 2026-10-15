import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'

export function countryFromLocale(locale: string | undefined): string {
  const region = (locale ?? '').split(/[-_]/)[1] ?? ''
  return /^[a-z]{2}$/i.test(region) ? region.toLowerCase() : 'us'
}

export const STARTER_SIZE = 8

export async function chartSongs(country: string, signal?: AbortSignal, limit?: number): Promise<Song[]> {
  const data = await getJson<{ songs: Song[] }>('/api/charts', limit ? { country, limit: String(limit) } : { country }, signal)
  return data.songs
}

export function starterSongs(signal?: AbortSignal): Promise<Song[]> {
  return chartSongs(countryFromLocale(globalThis.navigator?.language), signal, STARTER_SIZE)
}
