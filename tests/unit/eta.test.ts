import { describe, expect, it } from 'vitest'
import { etaFor, formatClock } from '../../src/core/eta.ts'

const MIN = 60000
const order = [
  { id: 'a', durationMs: 3 * MIN },
  { id: 'b', durationMs: 4 * MIN },
  { id: 'c', durationMs: 2 * MIN },
  { id: 'd', durationMs: 5 * MIN },
]

describe('etaFor', () => {
  it('starts the next songs after what is left of the current one', () => {
    const result = etaFor({ order, currentId: 'b', positionMs: MIN, currentDurationMs: 4 * MIN, now: 0, repeat: 'off' })
    expect(result.starts.has('a')).toBe(false)
    expect(result.starts.has('b')).toBe(false)
    expect(result.starts.get('c')).toBe(3 * MIN)
    expect(result.starts.get('d')).toBe(5 * MIN)
    expect(result.landsAt).toBe(10 * MIN)
  })

  it('follows the given order, so a shuffled order changes every time', () => {
    const shuffled = [order[2], order[0], order[3], order[1]].map((stop) => ({ ...stop! }))
    const result = etaFor({ order: shuffled, currentId: 'c', positionMs: 0, currentDurationMs: 0, now: 1000, repeat: 'off' })
    expect(result.starts.get('a')).toBe(1000 + 2 * MIN)
    expect(result.starts.get('d')).toBe(1000 + 5 * MIN)
    expect(result.starts.get('b')).toBe(1000 + 10 * MIN)
    expect(result.landsAt).toBe(1000 + 14 * MIN)
  })

  it('uses the real length of the current track when the player knows it', () => {
    const result = etaFor({ order, currentId: 'a', positionMs: 0, currentDurationMs: 30000, now: 0, repeat: 'off' })
    expect(result.starts.get('b')).toBe(30000)
  })

  it('skips unavailable songs', () => {
    const withGap = order.map((stop) => (stop.id === 'c' ? { ...stop, unavailable: true } : stop))
    const result = etaFor({ order: withGap, currentId: 'a', positionMs: 0, currentDurationMs: 0, now: 0, repeat: 'off' })
    expect(result.starts.has('c')).toBe(false)
    expect(result.starts.get('d')).toBe(7 * MIN)
    expect(result.landsAt).toBe(12 * MIN)
  })

  it('resumes at the current plan song after a song played outside the plan', () => {
    const result = etaFor({ order, currentId: 'b', positionMs: 0, currentDurationMs: 0, now: 0, repeat: 'off', looseRemainingMs: MIN })
    expect(result.starts.get('b')).toBe(MIN)
    expect(result.starts.get('c')).toBe(5 * MIN)
  })

  it('never lands while repeating', () => {
    expect(etaFor({ order, currentId: 'a', positionMs: 0, currentDurationMs: 0, now: 0, repeat: 'all' }).landsAt).toBeNull()
    const one = etaFor({ order, currentId: 'a', positionMs: 0, currentDurationMs: 0, now: 0, repeat: 'one' })
    expect(one.landsAt).toBeNull()
    expect(one.starts.size).toBe(0)
  })

  it('has nothing to say without a current song', () => {
    const result = etaFor({ order, currentId: null, positionMs: 0, currentDurationMs: 0, now: 0, repeat: 'off' })
    expect(result.starts.size).toBe(0)
    expect(result.landsAt).toBeNull()
  })

  it('formats clock times as 24 hour English time', () => {
    expect(formatClock(new Date(2026, 0, 1, 15, 7).getTime())).toBe('15:07')
    expect(formatClock(new Date(2026, 0, 1, 9, 5).getTime())).toBe('09:05')
  })
})
