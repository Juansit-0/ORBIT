import { PlayerEmitter, type PlayerAdapter, type PlayerListener, type PlayerSource } from './PlayerAdapter.ts'

export class PreviewPlayer implements PlayerAdapter {
  readonly kind = 'preview'
  private readonly emitter = new PlayerEmitter()
  private readonly audio = new Audio()

  get element(): HTMLAudioElement {
    return this.audio
  }

  constructor() {
    this.audio.crossOrigin = 'anonymous'
    this.audio.preload = 'auto'
    this.audio.volume = 0.8
    this.audio.addEventListener('playing', () => this.emitter.emit({ type: 'state', state: 'playing' }))
    this.audio.addEventListener('pause', () => {
      if (!this.audio.ended) this.emitter.emit({ type: 'state', state: 'paused' })
    })
    this.audio.addEventListener('waiting', () => this.emitter.emit({ type: 'state', state: 'loading' }))
    this.audio.addEventListener('timeupdate', () => this.emitProgress())
    this.audio.addEventListener('ended', () => {
      this.emitter.emit({ type: 'state', state: 'ended' })
      this.emitter.emit({ type: 'ended' })
    })
    this.audio.addEventListener('error', () => {
      if (this.audio.src) this.emitter.emit({ type: 'error', reason: 'network' })
    })
  }

  subscribe(listener: PlayerListener): () => void {
    return this.emitter.subscribe(listener)
  }

  async load(source: PlayerSource, autoplay: boolean): Promise<void> {
    if (!source.previewUrl) throw new Error('A previewUrl is required')
    this.emitter.emit({ type: 'state', state: 'loading' })
    this.audio.src = source.previewUrl
    this.emitProgress()
    if (autoplay) await this.audio.play().catch(() => this.emitter.emit({ type: 'state', state: 'paused' }))
    else this.emitter.emit({ type: 'state', state: 'paused' })
  }

  play(): void {
    void this.audio.play().catch(() => this.emitter.emit({ type: 'state', state: 'paused' }))
  }

  pause(): void {
    this.audio.pause()
  }

  stop(): void {
    this.audio.pause()
    this.audio.removeAttribute('src')
    this.audio.load()
    this.emitter.emit({ type: 'state', state: 'idle' })
  }

  seek(ms: number): void {
    this.audio.currentTime = Math.max(0, ms) / 1000
    this.emitProgress()
  }

  setVolume(volume: number): void {
    this.audio.volume = Math.min(100, Math.max(0, volume)) / 100
  }

  destroy(): void {
    this.stop()
    this.emitter.clear()
  }

  private emitProgress(): void {
    const durationMs = Number.isFinite(this.audio.duration) ? this.audio.duration * 1000 : 30000
    this.emitter.emit({ type: 'progress', currentMs: this.audio.currentTime * 1000, durationMs })
  }
}
