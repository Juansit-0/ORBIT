import type { PlayerApp } from '../app/PlayerApp.ts'
import { IdleClock } from './idleClock.ts'

export interface CinemaOptions {
  delayMs: () => number | null
  fullscreen: () => boolean
}

type CinemaListener = (active: boolean) => void

const SWITCH_MS = 280
const MANUAL_GRACE_MS = 1200

export class CinemaMode {
  private readonly app: PlayerApp
  private readonly options: CinemaOptions
  private readonly clock = new IdleClock(performance.now())
  private readonly listeners = new Set<CinemaListener>()
  private activeState = false
  private ownFullscreen = false
  private switching: number | undefined
  private lastPointer = { x: -1, y: -1 }

  constructor(app: PlayerApp, options: CinemaOptions) {
    this.app = app
    this.options = options
    const onActivity = (event: Event) => {
      if (event instanceof KeyboardEvent && (event.key === 'o' || event.key === 'O') && !event.metaKey && !event.ctrlKey) return
      if (event instanceof PointerEvent && event.type === 'pointermove') {
        const moved = Math.hypot(event.clientX - this.lastPointer.x, event.clientY - this.lastPointer.y)
        this.lastPointer = { x: event.clientX, y: event.clientY }
        if (moved < 4) return
      }
      if (this.clock.activity(performance.now()) && this.activeState) this.exit()
    }
    for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const) {
      window.addEventListener(type, onActivity, { capture: true, passive: true })
    }
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.ownFullscreen) {
        this.ownFullscreen = false
        this.exit()
      }
    })
    app.playback.subscribe((state) => {
      if (this.activeState && state.status !== 'playing' && state.status !== 'loading') this.exit()
    })
    window.setInterval(() => this.check(), 500)
  }

  get active(): boolean {
    return this.activeState
  }

  onChange(listener: CinemaListener): void {
    this.listeners.add(listener)
  }

  toggle(): void {
    if (this.activeState) this.exit()
    else this.enter(true)
  }

  enter(manual: boolean): void {
    if (this.activeState || !this.app.playback.state.song) return
    this.clock.grace(performance.now(), manual ? MANUAL_GRACE_MS : 400)
    if (manual && this.options.fullscreen() && !document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .then(() => (this.ownFullscreen = true))
        .catch(() => (this.ownFullscreen = false))
    }
    this.apply(true)
  }

  exit(): void {
    if (!this.activeState) return
    this.clock.activity(performance.now())
    if (this.ownFullscreen && document.fullscreenElement) {
      this.ownFullscreen = false
      void document.exitFullscreen().catch(() => undefined)
    }
    this.apply(false)
  }

  private blocked(): boolean {
    const focused = document.activeElement
    if (focused instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button'].includes(focused.type)) return true
    if (focused instanceof HTMLTextAreaElement) return true
    if (document.querySelector(':popover-open, dialog[open], [data-dragging="true"]')) return true
    return false
  }

  private check(): void {
    if (this.activeState) return
    const status = this.app.playback.state.status
    const entering = this.clock.shouldEnter({
      now: performance.now(),
      playing: status === 'playing',
      delayMs: this.options.delayMs(),
      blocked: this.blocked(),
    })
    if (entering) this.enter(false)
  }

  private apply(active: boolean): void {
    this.activeState = active
    const root = document.documentElement
    window.clearTimeout(this.switching)
    root.dataset.cinemaPhase = 'fade'
    this.switching = window.setTimeout(() => {
      root.dataset.cinema = String(active)
      window.dispatchEvent(new Event('resize'))
      requestAnimationFrame(() => {
        delete root.dataset.cinemaPhase
      })
    }, SWITCH_MS)
    for (const listener of this.listeners) listener(active)
  }
}
