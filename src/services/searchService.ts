import type { Song } from '../core/types.ts'
import { getJson } from './http.ts'

export async function searchSongs(term: string, signal?: AbortSignal): Promise<Song[]> {
  const data = await getJson<{ songs: Song[] }>('/api/search', { term }, signal)
  return data.songs
}
