export interface PulseProfile {
  bpm: number
  swing: number
  accent: number
}

export function hashSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

export function profileFor(seed: string): PulseProfile {
  const n = hashSeed(seed)
  return {
    bpm: 84 + Math.round(n * 44),
    swing: 0.08 + ((n * 7.31) % 1) * 0.12,
    accent: 0.55 + ((n * 3.17) % 1) * 0.35,
  }
}

export function pulseAt(timeMs: number, profile: PulseProfile): number {
  const beat = (timeMs / 60000) * profile.bpm
  const phase = beat - Math.floor(beat)
  const bar = Math.floor(beat) % 4
  const kick = Math.exp(-phase * 7.5)
  const offbeat = Math.exp(-Math.abs(phase - 0.5 - profile.swing) * 18) * 0.35
  const weight = bar === 0 ? 1 : profile.accent
  return Math.min(1, kick * weight + offbeat)
}
