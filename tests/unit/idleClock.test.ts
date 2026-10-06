import { describe, expect, it } from 'vitest'
import { IdleClock } from '../../src/ui/idleClock.ts'

const base = { playing: true, delayMs: 20000, blocked: false }

describe('IdleClock', () => {
  it('enters after the delay of inactivity while playing', () => {
    const clock = new IdleClock(0)
    expect(clock.shouldEnter({ ...base, now: 19999 })).toBe(false)
    expect(clock.shouldEnter({ ...base, now: 20000 })).toBe(true)
    expect(clock.remaining({ ...base, now: 5000 })).toBe(15000)
  })

  it('restarts the countdown on activity', () => {
    const clock = new IdleClock(0)
    expect(clock.activity(15000)).toBe(true)
    expect(clock.shouldEnter({ ...base, now: 30000 })).toBe(false)
    expect(clock.shouldEnter({ ...base, now: 35000 })).toBe(true)
  })

  it('never enters when paused, blocked or set to never', () => {
    const clock = new IdleClock(0)
    expect(clock.shouldEnter({ ...base, now: 99999, playing: false })).toBe(false)
    expect(clock.shouldEnter({ ...base, now: 99999, blocked: true })).toBe(false)
    expect(clock.shouldEnter({ ...base, now: 99999, delayMs: null })).toBe(false)
    expect(clock.remaining({ ...base, now: 1, delayMs: null })).toBeNull()
  })

  it('ignores activity during a grace period', () => {
    const clock = new IdleClock(0)
    clock.grace(1000, 1200)
    expect(clock.activity(1500)).toBe(false)
    expect(clock.activity(2300)).toBe(true)
  })
})
