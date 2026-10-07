import { describe, expect, it, vi } from 'vitest'
import { DjMix, MIX_MS, mixProgress, shouldMix, type MixContext } from '../../src/player/DjMix.ts'
import type { PlaybackController, PlaybackState } from '../../src/player/PlaybackController.ts'
import { Playlist } from '../../src/core/Playlist.ts'
import { song } from './helpers.ts'

const base: PlaybackState = {
  status: 'playing',
  nodeId: 'n',
  currentMs: 195000,
  durationMs: 200000,
  source: 'full',
  volume: 80,
  song: null,
  inPlan: true,
  mixing: false,
}

const on: MixContext = { enabled: true, hasNext: true, repeatOne: false, stopAfter: false }

describe('shouldMix', () => {
  it('starts in the last eight seconds of a song', () => {
    expect(shouldMix({ ...base, currentMs: 200000 - MIX_MS }, on)).toBe(true)
    expect(shouldMix({ ...base, currentMs: 200000 - MIX_MS - 1 }, on)).toBe(false)
  })

  it('stays quiet when off, mixing, paused, alone or repeating one', () => {
    expect(shouldMix(base, { ...on, enabled: false })).toBe(false)
    expect(shouldMix({ ...base, mixing: true }, on)).toBe(false)
    expect(shouldMix({ ...base, status: 'paused' }, on)).toBe(false)
    expect(shouldMix(base, { ...on, hasNext: false })).toBe(false)
    expect(shouldMix(base, { ...on, repeatOne: true })).toBe(false)
    expect(shouldMix(base, { ...on, stopAfter: true })).toBe(false)
  })

  it('skips songs outside the plan and very short ones', () => {
    expect(shouldMix({ ...base, inPlan: false }, on)).toBe(false)
    expect(shouldMix({ ...base, durationMs: 15000, currentMs: 9000 }, on)).toBe(false)
  })
})

describe('mixProgress', () => {
  it('runs from 0 to 1 across the mix', () => {
    expect(mixProgress(base)).toBe(0)
    expect(mixProgress({ ...base, mixing: true, currentMs: 200000 - MIX_MS })).toBe(0)
    expect(mixProgress({ ...base, mixing: true, currentMs: 200000 - MIX_MS / 2 })).toBe(0.5)
    expect(mixProgress({ ...base, mixing: true, currentMs: 200000 })).toBe(1)
  })
})

describe('DjMix', () => {
  function setup(enabled: boolean) {
    let listener: (state: PlaybackState) => void = () => {}
    const mixToNext = vi.fn(async () => true)
    const playback = {
      subscribe: (next: (state: PlaybackState) => void) => {
        listener = next
        return () => undefined
      },
      mixToNext,
      stopsAfterCurrent: false,
    } as unknown as PlaybackController
    const playlist = new Playlist()
    for (const id of ['a', 'b']) playlist.addLast(song(id))
    playlist.next()
    const dj = new DjMix(playback, playlist, enabled)
    return { dj, mixToNext, emit: (state: Partial<PlaybackState>) => listener({ ...base, ...state }) }
  }

  it('mixes once per song and arms again after leaving the last seconds', () => {
    const { mixToNext, emit } = setup(true)
    emit({ nodeId: 'n1', currentMs: 195000 })
    emit({ nodeId: 'n1', currentMs: 196000 })
    expect(mixToNext).toHaveBeenCalledTimes(1)
    emit({ nodeId: 'n1', currentMs: 100000 })
    emit({ nodeId: 'n1', currentMs: 195000 })
    expect(mixToNext).toHaveBeenCalledTimes(2)
    emit({ nodeId: 'n2', currentMs: 195000 })
    expect(mixToNext).toHaveBeenCalledTimes(3)
  })

  it('does nothing while off and reports changes', () => {
    const { dj, mixToNext, emit } = setup(false)
    const seen: boolean[] = []
    dj.onChange((enabled) => seen.push(enabled))
    emit({ currentMs: 195000 })
    expect(mixToNext).not.toHaveBeenCalled()
    expect(dj.toggle()).toBe(true)
    dj.setEnabled(true)
    expect(seen).toEqual([true])
  })
})
