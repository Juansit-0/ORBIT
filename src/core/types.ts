export interface Song {
  id: string
  title: string
  artist: string
  album: string
  artworkUrl: string
  durationMs: number
  previewUrl?: string
  genre?: string
  videoId?: string
  unavailable?: boolean
}

export type RepeatMode = 'off' | 'all' | 'one'
