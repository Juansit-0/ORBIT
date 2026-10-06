import type { PlayerApp } from '../app/PlayerApp.ts'
import type { Song } from '../core/types.ts'
import {
  BANDS,
  BeatTracker,
  bandEnergy,
  beatBetween,
  buildProfile,
  profileAt,
  type AudioFeatures,
  type SongProfile,
} from './analysis.ts'

export type ReactSource = 'live' | 'preview' | 'analysis' | 'none'
export type LiveResult = 'ok' | 'denied' | 'no-audio' | 'unsupported'

type ReactorListener = (reactor: AudioReactor) => void

const TARGET_RATE = 22050

class LiveBands {
  private readonly analyser: AnalyserNode
  private readonly data: Float32Array<ArrayBuffer>
  private readonly magnitudes: Float32Array
  private readonly peaks = { bass: 1e-6, mid: 1e-6, treble: 1e-6 }

  constructor(analyser: AnalyserNode) {
    this.analyser = analyser
    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.55
    this.data = new Float32Array(analyser.frequencyBinCount)
    this.magnitudes = new Float32Array(analyser.frequencyBinCount)
  }

  read(delta: number): Omit<AudioFeatures, 'beat'> {
    this.analyser.getFloatFrequencyData(this.data)
    for (let i = 0; i < this.data.length; i++) this.magnitudes[i] = Number.isFinite(this.data[i]!) ? 10 ** (this.data[i]! / 20) : 0
    const rate = this.analyser.context.sampleRate
    const size = this.analyser.fftSize
    const raw = {
      bass: bandEnergy(this.magnitudes, rate, size, BANDS.bass),
      mid: bandEnergy(this.magnitudes, rate, size, BANDS.mid),
      treble: bandEnergy(this.magnitudes, rate, size, BANDS.treble),
    }
    const decay = Math.exp(-delta / 6)
    const out = { bass: 0, mid: 0, treble: 0 }
    for (const band of ['bass', 'mid', 'treble'] as const) {
      this.peaks[band] = Math.max(raw[band], this.peaks[band] * decay, 1e-7)
      out[band] = Math.min(1, raw[band] / this.peaks[band]) ** 1.4
    }
    return out
  }
}

export class AudioReactor {
  private readonly app: PlayerApp
  private readonly previewElement: HTMLAudioElement | null
  private context: AudioContext | null = null
  private previewBands: LiveBands | null = null
  private liveBands: LiveBands | null = null
  private liveStream: MediaStream | null = null
  private readonly profiles = new Map<string, SongProfile | null>()
  private readonly pending = new Set<string>()
  private readonly tracker = new BeatTracker()
  private readonly listeners = new Set<ReactorListener>()
  private worker: Worker | null = null
  private readonly waiting = new Map<string, (profile: SongProfile) => void>()
  private smooth: AudioFeatures = { bass: 0, mid: 0, treble: 0, beat: 0 }
  private lastSeconds = 0
  private positionMs = 0
  private positionStamp = performance.now()
  private lastFrame = performance.now()

  constructor(app: PlayerApp, previewElement: HTMLAudioElement | null) {
    this.app = app
    this.previewElement = previewElement
    const unlock = () => {
      this.ensureContext()
      void this.context?.resume()
    }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    app.playback.subscribe((state) => {
      this.positionMs = state.currentMs
      this.positionStamp = performance.now()
      const node = state.nodeId ? app.playlist.list.findById(state.nodeId) : null
      if (node) void this.prepare(node.value)
      this.emit()
    })
  }

  get source(): ReactSource {
    const state = this.app.playback.state
    if (this.liveBands) return 'live'
    if (state.source === 'preview' && this.previewBands) return 'preview'
    if (state.source === 'full' && this.currentProfile()) return 'analysis'
    return 'none'
  }

  get liveActive(): boolean {
    return this.liveBands !== null
  }

  static liveSupported(): boolean {
    return typeof navigator.mediaDevices?.getDisplayMedia === 'function'
  }

  subscribe(listener: ReactorListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  features(): AudioFeatures | null {
    const now = performance.now()
    const delta = Math.min(0.1, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    const state = this.app.playback.state
    const playing = state.status === 'playing'
    let target: Omit<AudioFeatures, 'beat'> | null = null
    let beat = 0
    const source = this.source
    if (source === 'live' && this.liveBands) {
      target = this.liveBands.read(delta)
      beat = this.tracker.update(target.bass, now / 1000, delta)
    } else if (source === 'preview' && this.previewBands && playing) {
      target = this.previewBands.read(delta)
      beat = this.tracker.update(target.bass, now / 1000, delta)
    } else if (source === 'analysis' && playing) {
      const profile = this.currentProfile() as SongProfile
      const seconds = (this.positionMs + (now - this.positionStamp)) / 1000
      target = profileAt(profile, seconds)
      const hit = beatBetween(profile, this.lastSeconds, seconds)
      this.lastSeconds = seconds
      beat = hit ? 1 : Math.max(0, this.smooth.beat - delta * 4)
    }
    if (!target) {
      this.smooth = { bass: this.smooth.bass * 0.9, mid: this.smooth.mid * 0.9, treble: this.smooth.treble * 0.9, beat: 0 }
      return null
    }
    const attack = Math.min(1, delta * 22)
    const release = Math.min(1, delta * 7)
    const ease = (from: number, to: number) => from + (to - from) * (to > from ? attack : release)
    this.smooth = {
      bass: ease(this.smooth.bass, target.bass),
      mid: ease(this.smooth.mid, target.mid),
      treble: ease(this.smooth.treble, target.treble),
      beat,
    }
    return this.smooth
  }

  async startLive(): Promise<LiveResult> {
    if (!AudioReactor.liveSupported()) return 'unsupported'
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
      } as DisplayMediaStreamOptions)
    } catch {
      return 'denied'
    }
    for (const track of stream.getVideoTracks()) track.stop()
    const [audio] = stream.getAudioTracks()
    if (!audio) {
      for (const track of stream.getTracks()) track.stop()
      return 'no-audio'
    }
    const context = this.ensureContext()
    await context.resume()
    const analyser = context.createAnalyser()
    context.createMediaStreamSource(new MediaStream([audio])).connect(analyser)
    this.liveStream = stream
    this.liveBands = new LiveBands(analyser)
    audio.addEventListener('ended', () => this.stopLive())
    this.emit()
    return 'ok'
  }

  stopLive(): void {
    for (const track of this.liveStream?.getTracks() ?? []) track.stop()
    this.liveStream = null
    this.liveBands = null
    this.emit()
  }

  private ensureContext(): AudioContext {
    if (!this.context) {
      this.context = new AudioContext()
      if (this.previewElement) {
        try {
          const analyser = this.context.createAnalyser()
          const source = this.context.createMediaElementSource(this.previewElement)
          source.connect(analyser)
          analyser.connect(this.context.destination)
          this.previewBands = new LiveBands(analyser)
        } catch {
          this.previewBands = null
        }
      }
    }
    return this.context
  }

  private currentProfile(): SongProfile | null {
    const nodeId = this.app.playback.state.nodeId
    const node = nodeId ? this.app.playlist.list.findById(nodeId) : null
    return node ? (this.profiles.get(node.value.id) ?? null) : null
  }

  private async prepare(song: Song): Promise<void> {
    if (!song.previewUrl || this.profiles.has(song.id) || this.pending.has(song.id)) return
    this.pending.add(song.id)
    try {
      const response = await fetch(song.previewUrl)
      if (!response.ok) throw new Error('Preview unavailable')
      const decoder = new OfflineAudioContext(1, 1, 44100)
      const buffer = await decoder.decodeAudioData(await response.arrayBuffer())
      const channel = buffer.getChannelData(0)
      const factor = Math.max(1, Math.round(buffer.sampleRate / TARGET_RATE))
      const samples = new Float32Array(Math.floor(channel.length / factor))
      for (let i = 0; i < samples.length; i++) {
        let sum = 0
        for (let c = 0; c < buffer.numberOfChannels; c++) sum += buffer.getChannelData(c)[i * factor] ?? 0
        samples[i] = sum / buffer.numberOfChannels
      }
      this.profiles.set(song.id, await this.analyse(song.id, samples, buffer.sampleRate / factor))
    } catch {
      this.profiles.set(song.id, null)
    } finally {
      this.pending.delete(song.id)
      this.emit()
    }
  }

  private analyse(id: string, samples: Float32Array, rate: number): Promise<SongProfile> {
    if (typeof Worker === 'undefined') return Promise.resolve(buildProfile(samples, rate))
    if (!this.worker) {
      try {
        this.worker = new Worker(new URL('./profileWorker.ts', import.meta.url), { type: 'module' })
        this.worker.addEventListener('message', (event: MessageEvent<{ id: string; profile: SongProfile }>) => {
          this.waiting.get(event.data.id)?.(event.data.profile)
          this.waiting.delete(event.data.id)
        })
      } catch {
        return Promise.resolve(buildProfile(samples, rate))
      }
    }
    return new Promise((resolve) => {
      this.waiting.set(id, resolve)
      this.worker?.postMessage({ id, samples, rate }, [samples.buffer])
    })
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this)
  }
}
