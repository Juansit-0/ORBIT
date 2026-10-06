import { PlayerEmitter, type PlayerAdapter, type PlayerListener, type PlayerSource } from './PlayerAdapter.ts'
import { loadYouTubeApi, type YouTubePlayerInstance } from './youtubeApi.ts'

export class YouTubePlayer implements PlayerAdapter {
  readonly kind = 'youtube'
  private readonly emitter = new PlayerEmitter()
  private readonly host: HTMLElement
  private player: YouTubePlayerInstance | null = null
  private ready: Promise<YouTubePlayerInstance> | null = null
  private timer: number | undefined
  private volume = 80
  private durationHint = 0

  constructor(host: HTMLElement) {
    this.host = host
  }

  subscribe(listener: PlayerListener): () => void {
    return this.emitter.subscribe(listener)
  }

  async load(source: PlayerSource, autoplay: boolean): Promise<void> {
    if (!source.videoId) throw new Error('A videoId is required')
    this.durationHint = source.durationMs
    this.emitter.emit({ type: 'state', state: 'loading' })
    const player = await this.ensurePlayer()
    if (autoplay) player.loadVideoById(source.videoId)
    else {
      player.cueVideoById(source.videoId)
      this.emitter.emit({ type: 'state', state: 'paused' })
    }
    this.emitter.emit({ type: 'progress', currentMs: 0, durationMs: this.durationHint })
  }

  play(): void {
    this.player?.playVideo()
  }

  pause(): void {
    this.player?.pauseVideo()
  }

  stop(): void {
    this.player?.stopVideo()
    this.stopTicker()
    this.emitter.emit({ type: 'state', state: 'idle' })
  }

  seek(ms: number): void {
    this.player?.seekTo(Math.max(0, ms) / 1000, true)
    this.tick()
  }

  setVolume(volume: number): void {
    this.volume = Math.round(Math.min(100, Math.max(0, volume)))
    this.player?.setVolume(this.volume)
  }

  destroy(): void {
    this.stopTicker()
    this.player?.destroy()
    this.player = null
    this.ready = null
    this.emitter.clear()
  }

  private ensurePlayer(): Promise<YouTubePlayerInstance> {
    if (this.ready) return this.ready
    this.ready = loadYouTubeApi().then(
      (YT) =>
        new Promise<YouTubePlayerInstance>((resolve) => {
          const mount = document.createElement('div')
          this.host.replaceChildren(mount)
          const instance: YouTubePlayerInstance = new YT.Player(mount, {
            width: '100%',
            height: '100%',
            playerVars: { playsinline: 1, controls: 0, disablekb: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
            events: {
              onReady: () => {
                this.player = instance
                instance.setVolume(this.volume)
                resolve(instance)
              },
              onStateChange: ({ data }) => this.handleState(data, YT.PlayerState),
              onError: () => this.emitter.emit({ type: 'error', reason: 'unplayable' }),
            },
          })
        }),
    )
    return this.ready
  }

  private handleState(
    code: number,
    states: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number },
  ): void {
    if (code === states.PLAYING) {
      this.emitter.emit({ type: 'state', state: 'playing' })
      this.startTicker()
    } else if (code === states.PAUSED) {
      this.emitter.emit({ type: 'state', state: 'paused' })
      this.stopTicker()
      this.tick()
    } else if (code === states.BUFFERING) {
      this.emitter.emit({ type: 'state', state: 'loading' })
    } else if (code === states.ENDED) {
      this.stopTicker()
      this.emitter.emit({ type: 'state', state: 'ended' })
      this.emitter.emit({ type: 'ended' })
    }
  }

  private tick(): void {
    if (!this.player) return
    const durationMs = (this.player.getDuration() || 0) * 1000 || this.durationHint
    this.emitter.emit({ type: 'progress', currentMs: this.player.getCurrentTime() * 1000, durationMs })
  }

  private startTicker(): void {
    this.stopTicker()
    this.timer = window.setInterval(() => this.tick(), 250)
  }

  private stopTicker(): void {
    window.clearInterval(this.timer)
    this.timer = undefined
  }
}
