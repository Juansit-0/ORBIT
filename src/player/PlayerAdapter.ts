export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

export type PlayerEvent =
  | { type: 'state'; state: PlayerState }
  | { type: 'progress'; currentMs: number; durationMs: number }
  | { type: 'ended' }
  | { type: 'error'; reason: 'unplayable' | 'network' }

export type PlayerListener = (event: PlayerEvent) => void

export interface PlayerSource {
  videoId?: string
  previewUrl?: string
  durationMs: number
}

export interface PlayerAdapter {
  readonly kind: 'youtube' | 'preview' | 'fake'
  load(source: PlayerSource, autoplay: boolean): Promise<void>
  play(): void
  pause(): void
  stop(): void
  seek(ms: number): void
  setVolume(volume: number): void
  subscribe(listener: PlayerListener): () => void
  destroy(): void
}

export class PlayerEmitter {
  private readonly listeners = new Set<PlayerListener>()

  subscribe(listener: PlayerListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: PlayerEvent): void {
    for (const listener of this.listeners) listener(event)
  }

  clear(): void {
    this.listeners.clear()
  }
}
