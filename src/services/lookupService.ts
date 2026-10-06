import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'

export async function lookupSongs(ids: string[]): Promise<Song[]> {
  const data = await getJson<{ songs: Song[] }>('/api/lookup', { ids: ids.join('.') })
  return data.songs
}
