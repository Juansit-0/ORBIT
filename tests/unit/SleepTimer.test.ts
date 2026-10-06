import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FADE_MS, SleepTimer, type SleepTimerDeps } from '../../src/player/SleepTimer.ts'

describe('SleepTimer', () => {
  let volume: number
  let deps: SleepTimerDeps & { pause: ReturnType<typeof vi.fn<() => void>>; stopAfterCurrent: ReturnType<typeof vi.fn<(enabled: boolean) => void>> }
  let timer: SleepTimer

  beforeEach(() => {
    vi.useFakeTimers()
    volume = 80
    deps = {
      now: () => Date.now(),
      setInterval: (callback, ms) => setInterval(callback, ms) as unknown as number,
      clearInterval: (id) => clearInterval(id),
      getVolume: () => volume,
      setVolume: (value) => {
        volume = value
      },
      pause: vi.fn<() => void>(),
      stopAfterCurrent: vi.fn<(enabled: boolean) => void>(),
    }
    timer = new SleepTimer(deps)
  })

  afterEach(() => vi.useRealTimers())

  it('counts down, fades out, pauses and restores the volume', () => {
    timer.set({ kind: 'minutes', minutes: 1 })
    expect(timer.remainingMs).toBe(60000)
    vi.advanceTimersByTime(60000 - FADE_MS / 2)
    expect(volume).toBeLessThan(80)
    expect(volume).toBeGreaterThan(0)
    vi.advanceTimersByTime(FADE_MS)
    expect(deps.pause).toHaveBeenCalledTimes(1)
    expect(volume).toBe(80)
    expect(timer.mode.kind).toBe('off')
  })

  it('cancelling during the fade restores the volume', () => {
    timer.set({ kind: 'minutes', minutes: 1 })
    vi.advanceTimersByTime(58000)
    expect(volume).toBeLessThan(80)
    timer.cancel()
    expect(volume).toBe(80)
    vi.advanceTimersByTime(10000)
    expect(deps.pause).not.toHaveBeenCalled()
  })

  it('stops after the current song', () => {
    timer.set({ kind: 'end-of-song' })
    expect(deps.stopAfterCurrent).toHaveBeenLastCalledWith(true)
    timer.songEnded()
    expect(deps.stopAfterCurrent).toHaveBeenLastCalledWith(false)
    expect(timer.mode.kind).toBe('off')
  })

  it('switching modes clears the previous one', () => {
    timer.set({ kind: 'end-of-song' })
    timer.set({ kind: 'minutes', minutes: 15 })
    expect(deps.stopAfterCurrent).toHaveBeenLastCalledWith(false)
    expect(timer.remainingMs).toBe(15 * 60000)
  })

  it('ignores invalid durations and song ends when off', () => {
    timer.set({ kind: 'minutes', minutes: 0 })
    expect(timer.mode.kind).toBe('off')
    timer.songEnded()
    expect(deps.stopAfterCurrent).not.toHaveBeenCalled()
  })

  it('notifies listeners', () => {
    const listener = vi.fn()
    timer.subscribe(listener)
    timer.set({ kind: 'minutes', minutes: 1 })
    vi.advanceTimersByTime(1000)
    expect(listener.mock.calls.length).toBeGreaterThan(2)
  })
})
