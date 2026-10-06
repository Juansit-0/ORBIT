import { PlayerEmitter, type PlayerAdapter, type PlayerListener, type PlayerSource } from './PlayerAdapter.ts'

export interface FakePlayerControls {
  finish(): void
  fail(): void
  readonly loaded: string | null
  readonly playing: boolean
  readonly positionMs: number
  readonly volume: number
}

declare global {
  interface Window {
    orbitFakePlayer?: FakePlayerControls
  }
}

export class FakePlayer implements PlayerAdapter {
  readonly kind = 'fake'
  private readonly emitter = new PlayerEmitter()
  private source: PlayerSource | null = null
  private position = 0
  private playing = false
  private volume = 80
  private timer: number | undefined

  constructor() {
    const controls = {
      finish: () => this.finish(),
      fail: () => this.emitter.emit({ type: 'error', reason: 'unplayable' }),
    }
    Object.defineProperties(controls, {
      loaded: { get: () => this.source?.videoId ?? this.source?.previewUrl ?? null },
      playing: { get: () => this.playing },
      positionMs: { get: () => this.position },
      volume: { get: () => this.volume },
    })
    window.orbitFakePlayer = controls as FakePlayerControls
  }

  subscribe(listener: PlayerListener): () => void {
    return this.emitter.subscribe(listener)
  }

  async load(source: PlayerSource, autoplay: boolean): Promise<void> {
    this.source = source
    this.position = 0
    this.emitter.emit({ type: 'state', state: 'loading' })
    await Promise.resolve()
    this.emitProgress()
    if (autoplay) this.play()
    else this.pause()
  }

  play(): void {
    if (!this.source) return
    this.playing = true
    window.clearInterval(this.timer)
    this.timer = window.setInterval(() => {
      this.position += 1000
      if (this.source && this.position >= this.source.durationMs) this.finish()
      else this.emitProgress()
    }, 1000)
    this.emitter.emit({ type: 'state', state: 'playing' })
  }

  pause(): void {
    this.playing = false
    window.clearInterval(this.timer)
    this.emitter.emit({ type: 'state', state: 'paused' })
  }

  stop(): void {
    this.playing = false
    window.clearInterval(this.timer)
    this.source = null
    this.position = 0
    this.emitter.emit({ type: 'state', state: 'idle' })
  }

  seek(ms: number): void {
    this.position = Math.max(0, ms)
    this.emitProgress()
  }

  setVolume(volume: number): void {
    this.volume = volume
  }

  destroy(): void {
    this.stop()
    this.emitter.clear()
  }

  private finish(): void {
    this.playing = false
    window.clearInterval(this.timer)
    this.emitter.emit({ type: 'state', state: 'ended' })
    this.emitter.emit({ type: 'ended' })
  }

  private emitProgress(): void {
    this.emitter.emit({ type: 'progress', currentMs: this.position, durationMs: this.source?.durationMs ?? 0 })
  }
}
