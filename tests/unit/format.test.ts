import { describe, expect, it } from 'vitest'
import { formatTime, plural } from '../../src/ui/format.ts'

describe('formatTime', () => {
  it.each([
    [0, '0:00'],
    [5000, '0:05'],
    [65000, '1:05'],
    [3725000, '1:02:05'],
    [-10, '0:00'],
    [Number.NaN, '0:00'],
  ])('formats %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected)
  })
})

describe('plural', () => {
  it('handles singular and plural', () => {
    expect(plural(1, 'song')).toBe('1 song')
    expect(plural(3, 'song')).toBe('3 songs')
  })
})
