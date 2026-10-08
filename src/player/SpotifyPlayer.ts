import { PlayerEmitter, type PlayerAdapter, type PlayerListener, type PlayerSource } from './PlayerAdapter.ts'

export interface SdkState {
  paused: boolean
  position: number
  duration: number
  track_window: { current_track: { uri: string } | null }
}

export interface SdkPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, callback: (payload: never) => void): void
  pause(): Promise<void>
  resume(): Promise<void>
  seek(ms: number): Promise<void>
  setVolume(volume: number): Promise<void>
  getCurrentState(): Promise<SdkState | null>
  activateElement?(): Promise<void>
}

export type SdkFactory = (options: { name: string; getOAuthToken: (callback: (token: string) => void) => void; volume: number }) => SdkPlayer

export interface SpotifyPlayerDeps {
  token: () => Promise<string>
  factory: () => Promise<SdkFactory>
  play: (deviceId: string, uri: string) => Promise<void>
  onFatal?: (reason: 'account' | 'authentication' | 'initialization', message: string) => void
  setInterval?: (callback: () => void, ms: number) => number
  clearInterval?: (handle: number) => void
}

export const NEAR_END_MS = 2500

export class SpotifyPlayer implements PlayerAdapter {
  readonly kind = 'spotify'
  private readonly emitter = new PlayerEmitter()
  private readonly deps: SpotifyPlayerDeps
  private device: Promise<{ player: SdkPlayer; deviceId: string }> | null = null
  private current: string | null = null
  private pending: string | null = null
  private volume = 80
  private nearEnd = false
  private ended = false
  private timer: number | null = null

  constructor(deps: SpotifyPlayerDeps) {
    this.deps = deps
  }

  subscribe(listener: PlayerListener): () => void {
    return this.emitter.subscribe(listener)
  }

  async load(source: PlayerSource, autoplay: boolean): Promise<void> {
    if (!source.trackId) throw new Error('A trackId is required')
    this.current = source.trackId
    this.nearEnd = false
    this.ended = false
    this.emitter.emit({ type: 'state', state: 'loading' })
    const { player, deviceId } = await this.ensureDevice()
    await player.setVolume(this.volume / 100)
    if (!autoplay) {
      this.pending = source.trackId
      this.emitter.emit({ type: 'progress', currentMs: 0, durationMs: source.durationMs })
      this.emitter.emit({ type: 'state', state: 'paused' })
      return
    }
    this.pending = null
    await player.activateElement?.()
    await this.deps.play(deviceId, source.trackId)
  }

  play(): void {
    void this.ensureDevice().then(async ({ player, deviceId }) => {
      if (this.pending) {
        const uri = this.pending
        this.pending = null
        await player.activateElement?.()
        await this.deps.play(deviceId, uri)
      } else {
        await player.resume()
      }
    }).catch(() => this.emitter.emit({ type: 'error', reason: 'network' }))
  }

  pause(): void {
    void this.device?.then(({ player }) => player.pause())
  }

  stop(): void {
    this.current = null
    this.pending = null
    this.stopPolling()
    void this.device?.then(({ player }) => player.pause())
  }

  seek(ms: number): void {
    this.nearEnd = false
    void this.device?.then(({ player }) => player.seek(Math.max(0, Math.round(ms))))
  }

  setVolume(volume: number): void {
    this.volume = volume
    void this.device?.then(({ player }) => player.setVolume(Math.min(1, Math.max(0, volume / 100))))
  }

  destroy(): void {
    this.stopPolling()
    void this.device?.then(({ player }) => player.disconnect())
    this.device = null
  }

  handleState(state: SdkState | null): void {
    if (!state || !this.current) return
    const uri = state.track_window.current_track?.uri ?? null
    if (uri !== this.current) return
    if (state.paused && state.position === 0 && this.nearEnd) {
      if (this.ended) return
      this.ended = true
      this.stopPolling()
      this.emitter.emit({ type: 'state', state: 'ended' })
      this.emitter.emit({ type: 'ended' })
      return
    }
    this.track(state)
    this.emitter.emit({ type: 'state', state: state.paused ? 'paused' : 'playing' })
    if (state.paused) this.stopPolling()
    else this.startPolling()
  }

  private track(state: SdkState): void {
    if (state.duration > 0 && state.position >= state.duration - NEAR_END_MS) this.nearEnd = true
    this.emitter.emit({ type: 'progress', currentMs: state.position, durationMs: state.duration })
  }

  private startPolling(): void {
    if (this.timer !== null) return
    const every = this.deps.setInterval ?? ((callback, ms) => window.setInterval(callback, ms))
    this.timer = every(() => {
      void this.device?.then(async ({ player }) => {
        const state = await player.getCurrentState()
        if (state && !state.paused && state.track_window.current_track?.uri === this.current) this.track(state)
      })
    }, 500)
  }

  private stopPolling(): void {
    if (this.timer === null) return
    const clear = this.deps.clearInterval ?? ((handle) => window.clearInterval(handle))
    clear(this.timer)
    this.timer = null
  }

  private ensureDevice(): Promise<{ player: SdkPlayer; deviceId: string }> {
    if (this.device) return this.device
    this.device = (async () => {
      const factory = await this.deps.factory()
      const player = factory({
        name: 'Orbit',
        volume: this.volume / 100,
        getOAuthToken: (callback) => void this.deps.token().then(callback),
      })
      const deviceId = await new Promise<string>((resolve, reject) => {
        player.addListener('ready', ((payload: { device_id: string }) => resolve(payload.device_id)) as (payload: never) => void)
        for (const [event, reason] of [['account_error', 'account'], ['authentication_error', 'authentication'], ['initialization_error', 'initialization']] as const) {
          player.addListener(event, ((payload: { message?: string }) => {
            this.deps.onFatal?.(reason, payload.message ?? '')
            reject(new Error(reason))
          }) as (payload: never) => void)
        }
        player.addListener('playback_error', (() => this.emitter.emit({ type: 'error', reason: 'unplayable' })) as (payload: never) => void)
        player.addListener('player_state_changed', ((state: SdkState | null) => this.handleState(state)) as (payload: never) => void)
        void player.connect().then((connected) => {
          if (!connected) reject(new Error('initialization'))
        })
      })
      return { player, deviceId }
    })()
    this.device.catch(() => {
      this.device = null
    })
    return this.device
  }
}

export function loadSpotifySdk(): Promise<SdkFactory> {
  const scope = window as unknown as { Spotify?: { Player: new (options: Parameters<SdkFactory>[0]) => SdkPlayer }; onSpotifyWebPlaybackSDKReady?: () => void }
  const toFactory = (): SdkFactory => (options) => new (scope.Spotify as { Player: new (options: Parameters<SdkFactory>[0]) => SdkPlayer }).Player(options)
  if (scope.Spotify) return Promise.resolve(toFactory())
  return new Promise((resolve, reject) => {
    scope.onSpotifyWebPlaybackSDKReady = () => resolve(toFactory())
    const script = document.createElement('script')
    script.src = 'https://sdk.scdn.co/spotify-player.js'
    script.async = true
    script.onerror = () => reject(new Error('The Spotify player could not be loaded'))
    document.head.append(script)
  })
}
