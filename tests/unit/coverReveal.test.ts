import { describe, expect, it } from 'vitest'
import { coverShown, type RevealInput } from '../../src/ui/coverReveal.ts'

const base: RevealInput = { hasSong: true, playing: true, hovering: false, now: 5000, holdUntil: 2000, reducedMotion: false }

describe('coverShown', () => {
  it('dissolves while playing after the start hold', () => {
    expect(coverShown(base)).toBe(false)
  })

  it('shows the cover during the first seconds of a song', () => {
    expect(coverShown({ ...base, now: 1000 })).toBe(true)
  })

  it('shows the cover when paused, hovered, empty or with reduced motion', () => {
    expect(coverShown({ ...base, playing: false })).toBe(true)
    expect(coverShown({ ...base, hovering: true })).toBe(true)
    expect(coverShown({ ...base, hasSong: false })).toBe(true)
    expect(coverShown({ ...base, reducedMotion: true })).toBe(true)
  })
})
