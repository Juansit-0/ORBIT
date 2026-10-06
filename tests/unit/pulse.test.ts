import { describe, expect, it } from 'vitest'
import { hashSeed, profileFor, pulseAt } from '../../src/scene/pulse.ts'

describe('pulse', () => {
  it('derives a stable profile per song', () => {
    expect(profileFor('617154366')).toEqual(profileFor('617154366'))
    expect(profileFor('a').bpm).not.toBe(profileFor('b').bpm)
  })

  it('keeps tempo in a musical range', () => {
    for (const seed of ['a', 'b', 'c', 'song-42', '']) {
      const { bpm } = profileFor(seed)
      expect(bpm).toBeGreaterThanOrEqual(84)
      expect(bpm).toBeLessThanOrEqual(128)
    }
  })

  it('peaks on the beat and stays within 0..1', () => {
    const profile = { bpm: 120, swing: 0.1, accent: 0.7 }
    expect(pulseAt(0, profile)).toBeCloseTo(1, 5)
    for (let t = 0; t < 4000; t += 37) {
      const value = pulseAt(t, profile)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
    expect(pulseAt(400, profile)).toBeLessThan(pulseAt(0, profile))
  })

  it('hashes into 0..1', () => {
    expect(hashSeed('x')).toBeGreaterThanOrEqual(0)
    expect(hashSeed('x')).toBeLessThanOrEqual(1)
  })
})
