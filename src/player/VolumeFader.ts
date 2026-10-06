export interface FadeTarget {
  setVolume(volume: number): void
}

export interface FaderClock {
  now: () => number
  schedule: (callback: () => void) => number
  cancel: (handle: number) => void
}

export const FADE_OUT_MS = 300
export const FADE_IN_MS = 450

const defaultClock: FaderClock = {
  now: () => performance.now(),
  schedule: (callback) => window.setTimeout(callback, 16),
  cancel: (handle) => window.clearTimeout(handle),
}

export function easeInOut(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2
}

export class VolumeFader {
  private readonly clock: FaderClock
  private handle: number | null = null
  private resolveCurrent: (() => void) | null = null

  constructor(clock: FaderClock = defaultClock) {
    this.clock = clock
  }

  get running(): boolean {
    return this.handle !== null
  }

  ramp(target: FadeTarget, from: number, to: number, ms: number): Promise<void> {
    this.cancel()
    return new Promise((resolve) => {
      const start = this.clock.now()
      this.resolveCurrent = resolve
      const step = () => {
        const t = ms <= 0 ? 1 : (this.clock.now() - start) / ms
        target.setVolume(Math.round(from + (to - from) * easeInOut(t)))
        if (t >= 1) {
          this.handle = null
          this.resolveCurrent = null
          resolve()
          return
        }
        this.handle = this.clock.schedule(step)
      }
      step()
    })
  }

  fadeOut(target: FadeTarget, from: number, ms = FADE_OUT_MS): Promise<void> {
    return this.ramp(target, from, 0, ms)
  }

  fadeIn(target: FadeTarget, to: number, ms = FADE_IN_MS): Promise<void> {
    return this.ramp(target, 0, to, ms)
  }

  cancel(): void {
    if (this.handle !== null) this.clock.cancel(this.handle)
    this.handle = null
    const resolve = this.resolveCurrent
    this.resolveCurrent = null
    resolve?.()
  }
}
