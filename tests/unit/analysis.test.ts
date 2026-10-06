import { describe, expect, it } from 'vitest'
import {
  BeatTracker,
  bandEnergy,
  beatBetween,
  buildProfile,
  estimateBpm,
  fft,
  normalize,
  onsetEnvelope,
  pickBeats,
  profileAt,
} from '../../src/audio/analysis.ts'

function clickTrack(bpm: number, seconds: number, rate: number): Float32Array {
  const samples = new Float32Array(Math.floor(seconds * rate))
  const period = (60 / bpm) * rate
  for (let beat = 0; beat * period < samples.length; beat++) {
    const start = Math.floor(beat * period)
    for (let i = 0; i < rate * 0.06 && start + i < samples.length; i++) {
      samples[start + i] = Math.sin((2 * Math.PI * 60 * i) / rate) * Math.exp(-i / (rate * 0.02))
    }
  }
  return samples
}

describe('fft', () => {
  it('finds the frequency of a pure tone', () => {
    const size = 1024
    const rate = 22050
    const real = new Float32Array(size)
    const imag = new Float32Array(size)
    for (let i = 0; i < size; i++) real[i] = Math.sin((2 * Math.PI * 1000 * i) / rate)
    fft(real, imag)
    const magnitudes = Array.from({ length: size / 2 }, (_, i) => Math.hypot(real[i]!, imag[i]!))
    const peak = magnitudes.indexOf(Math.max(...magnitudes))
    expect(peak * (rate / size)).toBeCloseTo(1000, -2)
    expect(bandEnergy(magnitudes, rate, size, [800, 1200])).toBeGreaterThan(bandEnergy(magnitudes, rate, size, [3000, 5000]) * 10)
  })
})

describe('normalize', () => {
  it('maps values into 0..1', () => {
    const out = normalize(new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 100]))
    expect(Math.min(...out)).toBe(0)
    expect(Math.max(...out)).toBe(1)
  })
})

describe('tempo and beats', () => {
  it('estimates the tempo of a click track', () => {
    const fps = 43
    const onsets = new Float32Array(fps * 20)
    const period = (60 / 120) * fps
    for (let t = 0; t < onsets.length; t += period) onsets[Math.round(t)] = 1
    expect(estimateBpm(onsets, fps)).toBeGreaterThan(115)
    expect(estimateBpm(onsets, fps)).toBeLessThan(125)
  })

  it('picks evenly spaced beats', () => {
    const fps = 40
    const onsets = new Float32Array(fps * 4)
    for (let t = 0; t < onsets.length; t += 20) onsets[t + 1] = 1
    const beats = pickBeats(onsets, fps)
    expect(beats.length).toBeGreaterThanOrEqual(7)
    expect(beats[1]! - beats[0]!).toBeCloseTo(0.5, 1)
  })

  it('computes positive flux only', () => {
    expect(Array.from(onsetEnvelope(new Float32Array([0, 1, 0.5, 2])))).toEqual([0, 1, 0, 1.5])
  })
})

describe('buildProfile', () => {
  it('builds a profile from audio with the right tempo and bass hits', () => {
    const rate = 22050
    const profile = buildProfile(clickTrack(128, 12, rate), rate)
    expect(profile.bpm).toBeGreaterThan(120)
    expect(profile.bpm).toBeLessThan(136)
    expect(profile.beats.length).toBeGreaterThan(15)
    expect(Math.max(...profile.bass)).toBe(1)
    expect(profile.duration).toBeGreaterThan(11)
  })

  it('reads looped features and beats at any time', () => {
    const profile = buildProfile(clickTrack(120, 8, 22050), 22050)
    const early = profileAt(profile, 0.01)
    const later = profileAt(profile, profile.duration + 0.01)
    expect(later.bass).toBeCloseTo(early.bass, 5)
    const first = profile.beats[0]!
    expect(beatBetween(profile, first - 0.05, first + 0.01)).toBe(true)
    expect(beatBetween(profile, first + profile.duration - 0.05, first + profile.duration + 0.01)).toBe(true)
    expect(beatBetween(profile, 1, 3)).toBe(false)
  })

  it('handles silence and empty input', () => {
    expect(buildProfile(new Float32Array(100), 22050).duration).toBe(0)
    expect(profileAt(buildProfile(new Float32Array(100), 22050), 3)).toEqual({ bass: 0, mid: 0, treble: 0 })
  })
})

describe('BeatTracker', () => {
  it('fires on sharp bass rises and decays', () => {
    const tracker = new BeatTracker()
    let level = 0
    for (let i = 0; i < 30; i++) level = tracker.update(0.1, i / 60, 1 / 60)
    expect(level).toBe(0)
    level = tracker.update(0.9, 0.6, 1 / 60)
    expect(level).toBe(1)
    for (let i = 1; i < 30; i++) level = tracker.update(0.9, 0.6 + i / 60, 1 / 60)
    expect(level).toBe(0)
  })
})
