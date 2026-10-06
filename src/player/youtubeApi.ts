export interface YouTubePlayerInstance {
  loadVideoById(videoId: string): void
  cueVideoById(videoId: string): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  setVolume(volume: number): void
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
}

export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      width: string
      height: string
      playerVars: Record<string, number | string>
      events: {
        onReady: () => void
        onStateChange: (event: { data: number }) => void
        onError: (event: { data: number }) => void
      }
    },
  ) => YouTubePlayerInstance
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number }
}

declare global {
  interface Window {
    YT?: YouTubeNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let loading: Promise<YouTubeNamespace> | null = null

export function loadYouTubeApi(): Promise<YouTubeNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      if (window.YT) resolve(window.YT)
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    script.onerror = () => {
      loading = null
      reject(new Error('YouTube API failed to load'))
    }
    document.head.append(script)
  })
  return loading
}
