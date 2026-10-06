export type SleepMode = { kind: 'off' } | { kind: 'minutes'; minutes: number } | { kind: 'end-of-song' }

export interface SleepTimerDeps {
  now: () => number
  setInterval: (callback: () => void, ms: number) => number
  clearInterval: (id: number) => void
  getVolume: () => number
  setVolume: (volume: number) => void
  pause: () => void
  stopAfterCurrent: (enabled: boolean) => void
}

export type SleepListener = (timer: SleepTimer) => void

export const FADE_MS = 8000

export class SleepTimer {
  private readonly deps: SleepTimerDeps
  private readonly listeners = new Set<SleepListener>()
  private current: SleepMode = { kind: 'off' }
  private deadline = 0
  private timer: number | null = null
  private fadeFrom: number | null = null

  constructor(deps: SleepTimerDeps) {
    this.deps = deps
  }

  get mode(): SleepMode {
    return this.current
  }

  get remainingMs(): number {
    return this.current.kind === 'minutes' ? Math.max(0, this.deadline - this.deps.now()) : 0
  }

  subscribe(listener: SleepListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  set(mode: SleepMode): void {
    this.reset()
    this.current = mode
    if (mode.kind === 'minutes') {
      if (!Number.isFinite(mode.minutes) || mode.minutes <= 0) {
        this.current = { kind: 'off' }
      } else {
        this.deadline = this.deps.now() + mode.minutes * 60000
        this.timer = this.deps.setInterval(() => this.tick(), 250)
      }
    } else if (mode.kind === 'end-of-song') {
      this.deps.stopAfterCurrent(true)
    }
    this.emit()
  }

  cancel(): void {
    this.set({ kind: 'off' })
  }

  songEnded(): void {
    if (this.current.kind !== 'end-of-song') return
    this.current = { kind: 'off' }
    this.deps.stopAfterCurrent(false)
    this.emit()
  }

  private tick(): void {
    const remaining = this.remainingMs
    if (remaining <= FADE_MS && remaining > 0) {
      if (this.fadeFrom === null) this.fadeFrom = this.deps.getVolume()
      this.deps.setVolume(Math.round(this.fadeFrom * (remaining / FADE_MS)))
    }
    if (remaining <= 0) {
      const restore = this.fadeFrom
      this.reset()
      this.current = { kind: 'off' }
      this.deps.pause()
      if (restore !== null) this.deps.setVolume(restore)
    }
    this.emit()
  }

  private reset(): void {
    if (this.timer !== null) this.deps.clearInterval(this.timer)
    this.timer = null
    if (this.fadeFrom !== null) this.deps.setVolume(this.fadeFrom)
    this.fadeFrom = null
    this.deadline = 0
    if (this.current.kind === 'end-of-song') this.deps.stopAfterCurrent(false)
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this)
  }
}
