import type { PlayerApp } from '../app/PlayerApp.ts'

export function bindMediaSession(app: PlayerApp): void {
  if (!('mediaSession' in navigator)) return
  const session = navigator.mediaSession
  const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
    ['play', () => void app.togglePlay()],
    ['pause', () => app.playback.pause()],
    ['previoustrack', () => void app.previous()],
    ['nexttrack', () => void app.next()],
    ['seekbackward', (details) => app.playback.seekBy(-(details.seekOffset ?? 10) * 1000)],
    ['seekforward', (details) => app.playback.seekBy((details.seekOffset ?? 10) * 1000)],
    ['seekto', (details) => {
      if (typeof details.seekTime === 'number') app.playback.seek(details.seekTime * 1000)
    }],
  ]
  for (const [action, handler] of handlers) {
    try {
      session.setActionHandler(action, handler)
    } catch {
      continue
    }
  }
  let lastKey = ''
  app.playback.subscribe((state) => {
    const node = state.nodeId ? app.playlist.list.findById(state.nodeId) : null
    const song = node?.value
    const key = song ? `${song.id}:${song.title}` : ''
    if (key !== lastKey) {
      lastKey = key
      session.metadata = song
        ? new MediaMetadata({
            title: song.title,
            artist: song.artist,
            album: song.album,
            artwork: [
              { src: song.artworkUrl.replace('600x600', '256x256'), sizes: '256x256', type: 'image/jpeg' },
              { src: song.artworkUrl, sizes: '600x600', type: 'image/jpeg' },
            ],
          })
        : null
    }
    session.playbackState = state.status === 'playing' || state.status === 'loading' ? 'playing' : state.nodeId ? 'paused' : 'none'
    const duration = state.durationMs / 1000
    if (duration > 0 && Number.isFinite(duration) && session.setPositionState) {
      try {
        session.setPositionState({ duration, position: Math.min(duration, Math.max(0, state.currentMs / 1000)), playbackRate: 1 })
      } catch {
        return
      }
    }
  })
}
