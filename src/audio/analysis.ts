export interface AudioFeatures {
  bass: number
  mid: number
  treble: number
  beat: number
}

export interface SongProfile {
  fps: number
  bpm: number
  duration: number
  bass: Float32Array
  mid: Float32Array
  treble: Float32Array
  beats: number[]
}

export const SILENT: AudioFeatures = { bass: 0, mid: 0, treble: 0, beat: 0 }

export const BANDS = {
  bass: [20, 160],
  mid: [250, 2000],
  treble: [4000, 11000],
} as const

export function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      const tr = real[i]!
      real[i] = real[j]!
      real[j] = tr
      const ti = imag[i]!
      imag[i] = imag[j]!
      imag[j] = ti
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const angle = (-2 * Math.PI) / size
    const wr = Math.cos(angle)
    const wi = Math.sin(angle)
    for (let start = 0; start < n; start += size) {
      let cr = 1
      let ci = 0
      for (let k = 0; k < size / 2; k++) {
        const a = start + k
        const b = a + size / 2
        const xr = real[b]! * cr - imag[b]! * ci
        const xi = real[b]! * ci + imag[b]! * cr
        real[b] = real[a]! - xr
        imag[b] = imag[a]! - xi
        real[a] = real[a]! + xr
        imag[a] = imag[a]! + xi
        const next = cr * wr - ci * wi
        ci = cr * wi + ci * wr
        cr = next
      }
    }
  }
}

export function bandEnergy(magnitudes: ArrayLike<number>, sampleRate: number, size: number, range: readonly [number, number]): number {
  const binHz = sampleRate / size
  const from = Math.max(1, Math.floor(range[0] / binHz))
  const to = Math.min(magnitudes.length - 1, Math.ceil(range[1] / binHz))
  if (to < from) return 0
  let sum = 0
  for (let i = from; i <= to; i++) sum += magnitudes[i] ?? 0
  return sum / (to - from + 1)
}

export function percentile(values: ArrayLike<number>, p: number): number {
  const sorted = Array.from(values).sort((a, b) => a - b)
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))] ?? 0
}

export function normalize(values: Float32Array): Float32Array {
  const ceiling = percentile(values, 0.96) || 1
  const floor = percentile(values, 0.1)
  const out = new Float32Array(values.length)
  for (let i = 0; i < values.length; i++) out[i] = Math.min(1, Math.max(0, (values[i]! - floor) / Math.max(1e-6, ceiling - floor)))
  return out
}

export function onsetEnvelope(...bands: Float32Array[]): Float32Array {
  const length = bands[0]?.length ?? 0
  const out = new Float32Array(length)
  for (let i = 1; i < length; i++) {
    let flux = 0
    for (const band of bands) flux += Math.max(0, band[i]! - band[i - 1]!)
    out[i] = flux
  }
  return out
}

export function estimateBpm(onsets: Float32Array, fps: number, min = 70, max = 180): number {
  const minLag = Math.floor((60 * fps) / max)
  const maxLag = Math.ceil((60 * fps) / min)
  let mean = 0
  for (const value of onsets) mean += value
  mean /= Math.max(1, onsets.length)
  let bestLag = 0
  let bestScore = -Infinity
  for (let lag = minLag; lag <= maxLag; lag++) {
    let score = 0
    for (let i = lag; i < onsets.length; i++) score += (onsets[i]! - mean) * (onsets[i - lag]! - mean)
    score /= onsets.length - lag
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }
  if (bestLag === 0) return 120
  let bpm = (60 * fps) / bestLag
  while (bpm < 80) bpm *= 2
  while (bpm > 178) bpm /= 2
  return Math.round(bpm * 10) / 10
}

export function pickBeats(onsets: Float32Array, fps: number, minGap = 0.25): number[] {
  let mean = 0
  for (const value of onsets) mean += value
  mean /= Math.max(1, onsets.length)
  let variance = 0
  for (const value of onsets) variance += (value - mean) ** 2
  const threshold = mean + Math.sqrt(variance / Math.max(1, onsets.length)) * 1.2
  const beats: number[] = []
  let last = -Infinity
  for (let i = 1; i < onsets.length - 1; i++) {
    const value = onsets[i]!
    if (value < threshold || value < onsets[i - 1]! || value < onsets[i + 1]!) continue
    const time = i / fps
    if (time - last < minGap) continue
    beats.push(time)
    last = time
  }
  return beats
}

export function buildProfile(samples: Float32Array, sampleRate: number, size = 1024, hop = 512): SongProfile {
  const frames = Math.max(0, Math.floor((samples.length - size) / hop) + 1)
  const bass = new Float32Array(frames)
  const mid = new Float32Array(frames)
  const treble = new Float32Array(frames)
  const real = new Float32Array(size)
  const imag = new Float32Array(size)
  const magnitudes = new Float32Array(size / 2)
  const window = new Float32Array(size)
  for (let i = 0; i < size; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1))
  for (let frame = 0; frame < frames; frame++) {
    const offset = frame * hop
    for (let i = 0; i < size; i++) {
      real[i] = (samples[offset + i] ?? 0) * window[i]!
      imag[i] = 0
    }
    fft(real, imag)
    for (let i = 0; i < size / 2; i++) magnitudes[i] = Math.hypot(real[i]!, imag[i]!)
    bass[frame] = bandEnergy(magnitudes, sampleRate, size, BANDS.bass)
    mid[frame] = bandEnergy(magnitudes, sampleRate, size, BANDS.mid)
    treble[frame] = bandEnergy(magnitudes, sampleRate, size, BANDS.treble)
  }
  const fps = sampleRate / hop
  const normalizedBass = normalize(bass)
  const normalizedMid = normalize(mid)
  const normalizedTreble = normalize(treble)
  const onsets = onsetEnvelope(normalizedBass, normalizedMid)
  return {
    fps,
    bpm: estimateBpm(onsets, fps),
    duration: frames / fps,
    bass: normalizedBass,
    mid: normalizedMid,
    treble: normalizedTreble,
    beats: pickBeats(onsetEnvelope(normalizedBass), fps),
  }
}

export function profileAt(profile: SongProfile, seconds: number): Omit<AudioFeatures, 'beat'> {
  if (profile.duration <= 0 || profile.bass.length === 0) return { bass: 0, mid: 0, treble: 0 }
  const looped = ((seconds % profile.duration) + profile.duration) % profile.duration
  const index = Math.min(profile.bass.length - 1, Math.floor(looped * profile.fps))
  return { bass: profile.bass[index] ?? 0, mid: profile.mid[index] ?? 0, treble: profile.treble[index] ?? 0 }
}

export function beatBetween(profile: SongProfile, from: number, to: number): boolean {
  if (profile.duration <= 0 || to <= from || to - from > 1) return false
  const a = ((from % profile.duration) + profile.duration) % profile.duration
  const b = a + (to - from)
  return profile.beats.some((time) => (time > a && time <= b) || (time + profile.duration > a && time + profile.duration <= b))
}

export class BeatTracker {
  private average = 0
  private previous = 0
  private lastBeat = -Infinity
  private level = 0

  update(bass: number, now: number, delta: number): number {
    const flux = Math.max(0, bass - this.previous)
    this.previous = bass
    this.average += (flux - this.average) * Math.min(1, delta * 2)
    this.level = Math.max(0, this.level - delta * 4)
    if (flux > Math.max(0.08, this.average * 2.6) && now - this.lastBeat > 0.22) {
      this.lastBeat = now
      this.level = 1
    }
    return this.level
  }
}
