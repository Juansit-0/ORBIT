import type { Playlist } from '../core/Playlist.ts'
import type { PlaybackController, PlaybackState } from './PlaybackController.ts'

export const MIX_MS = 8000

export interface MixContext {
  enabled: boolean
  hasNext: boolean
  repeatOne: boolean
  stopAfter: boolean
}

export function shouldMix(state: PlaybackState, context: MixContext): boolean {
  if (!context.enabled || state.mixing || !context.hasNext || context.repeatOne || context.stopAfter) return false
  if (state.status !== 'playing' || state.source === null || !state.inPlan) return false
  if (state.durationMs < MIX_MS * 2 || state.currentMs <= 0) return false
  return state.durationMs - state.currentMs <= MIX_MS
}

export function mixProgress(state: PlaybackState): number {
  if (!state.mixing) return 0
  return Math.min(1, Math.max(0, 1 - (state.durationMs - state.currentMs) / MIX_MS))
}

export class DjMix {
  private readonly playback: PlaybackController
  private readonly playlist: Playlist
  private enabledState: boolean
  private armedFor: string | null = null
  private armed = true
  private readonly listeners = new Set<(enabled: boolean) => void>()

  constructor(playback: PlaybackController, playlist: Playlist, enabled: boolean) {
    this.playback = playback
    this.playlist = playlist
    this.enabledState = enabled
    playback.subscribe((state) => this.check(state))
  }

  get enabled(): boolean {
    return this.enabledState
  }

  onChange(listener: (enabled: boolean) => void): void {
    this.listeners.add(listener)
  }

  setEnabled(enabled: boolean): void {
    if (this.enabledState === enabled) return
    this.enabledState = enabled
    for (const listener of this.listeners) listener(enabled)
  }

  toggle(): boolean {
    this.setEnabled(!this.enabledState)
    return this.enabledState
  }

  private check(state: PlaybackState): void {
    if (state.nodeId !== this.armedFor || state.durationMs - state.currentMs > MIX_MS) {
      this.armedFor = state.nodeId
      this.armed = true
    }
    if (!this.armed) return
    const context: MixContext = {
      enabled: this.enabledState,
      hasNext: this.playlist.peekNext() !== null,
      repeatOne: this.playlist.repeat === 'one',
      stopAfter: this.playback.stopsAfterCurrent,
    }
    if (!shouldMix(state, context)) return
    this.armed = false
    void this.playback.mixToNext(Math.max(1000, state.durationMs - state.currentMs - 400))
  }
}
