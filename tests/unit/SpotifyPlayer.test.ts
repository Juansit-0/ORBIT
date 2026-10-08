import { describe, expect, it, vi } from 'vitest'
import type { PlayerEvent } from '../../src/player/PlayerAdapter.ts'
import { SpotifyPlayer, type SdkPlayer, type SdkState } from '../../src/player/SpotifyPlayer.ts'

function fakeSdk(options: { fail?: 'account_error' } = {}) {
  const listeners = new Map<string, (payload: never) => void>()
  const player = {
    connect: vi.fn(async () => {
      queueMicrotask(() => {
        if (options.fail) listeners.get(options.fail)?.({ message: 'Premium required' } as never)
        else listeners.get('ready')?.({ device_id: 'device-1' } as never)
      })
      return true
    }),
    disconnect: vi.fn(),
    addListener: (event: string, callback: (payload: never) => void) => void listeners.set(event, callback),
    pause: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    seek: vi.fn(async () => undefined),
    setVolume: vi.fn(async () => undefined),
    getCurrentState: vi.fn(async (): Promise<SdkState | null> => null),
    activateElement: vi.fn(async () => undefined),
  } satisfies SdkPlayer
  const emitState = (state: SdkState | null) => listeners.get('player_state_changed')?.(state as never)
  return { player, emitState }
}

function state(uri: string, position: number, paused: boolean, duration = 200000): SdkState {
  return { paused, position, duration, track_window: { current_track: { uri } } }
}

function setup(options: { fail?: 'account_error' } = {}) {
  const sdk = fakeSdk(options)
  const play = vi.fn(async () => undefined)
  const onFatal = vi.fn()
  const adapter = new SpotifyPlayer({
    token: async () => 'tok',
    factory: async () => () => sdk.player,
    play,
    onFatal,
    setInterval: () => 1,
    clearInterval: () => undefined,
  })
  const events: PlayerEvent[] = []
  adapter.subscribe((event) => events.push(event))
  return { adapter, sdk, play, onFatal, events }
}

describe('SpotifyPlayer', () => {
  it('connects a device and plays the track on it', async () => {
    const { adapter, sdk, play, events } = setup()
    await adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, true)
    expect(play).toHaveBeenCalledWith('device-1', 'spotify:track:a')
    sdk.emitState(state('spotify:track:a', 1000, false))
    expect(events).toContainEqual({ type: 'state', state: 'playing' })
    expect(events).toContainEqual({ type: 'progress', currentMs: 1000, durationMs: 200000 })
  })

  it('waits for play when loaded paused', async () => {
    const { adapter, play, events } = setup()
    await adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, false)
    expect(play).not.toHaveBeenCalled()
    expect(events.at(-1)).toEqual({ type: 'state', state: 'paused' })
    adapter.play()
    await vi.waitFor(() => expect(play).toHaveBeenCalledWith('device-1', 'spotify:track:a'))
  })

  it('reports the end of the song once', async () => {
    const { adapter, sdk, events } = setup()
    await adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, true)
    sdk.emitState(state('spotify:track:a', 198500, false))
    sdk.emitState(state('spotify:track:a', 0, true))
    sdk.emitState(state('spotify:track:a', 0, true))
    expect(events.filter((event) => event.type === 'ended')).toHaveLength(1)
  })

  it('ignores other tracks and a pause in the middle', async () => {
    const { adapter, sdk, events } = setup()
    await adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, true)
    sdk.emitState(state('spotify:track:other', 5000, false))
    sdk.emitState(state('spotify:track:a', 0, true))
    expect(events.some((event) => event.type === 'ended')).toBe(false)
    expect(events.some((event) => event.type === 'progress' && event.currentMs === 5000)).toBe(false)
  })

  it('maps volume, seek and pause to the SDK', async () => {
    const { adapter, sdk } = setup()
    await adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, true)
    adapter.setVolume(40)
    adapter.seek(12345.6)
    adapter.pause()
    await vi.waitFor(() => expect(sdk.player.pause).toHaveBeenCalled())
    expect(sdk.player.setVolume).toHaveBeenLastCalledWith(0.4)
    expect(sdk.player.seek).toHaveBeenCalledWith(12346)
  })

  it('reports account errors such as a missing Premium plan', async () => {
    const { adapter, onFatal } = setup({ fail: 'account_error' })
    await expect(adapter.load({ trackId: 'spotify:track:a', durationMs: 200000 }, true)).rejects.toThrow('account')
    expect(onFatal).toHaveBeenCalledWith('account', 'Premium required')
  })
})
