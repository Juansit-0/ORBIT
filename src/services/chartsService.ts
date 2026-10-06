import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'

export function countryFromLocale(locale: string | undefined): string {
  const region = (locale ?? '').split(/[-_]/)[1] ?? ''
  return /^[a-z]{2}$/i.test(region) ? region.toLowerCase() : 'us'
}

export async function chartSongs(country: string, signal?: AbortSignal): Promise<Song[]> {
  const data = await getJson<{ songs: Song[] }>('/api/charts', { country }, signal)
  return data.songs
}
