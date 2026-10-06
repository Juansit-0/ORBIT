import { describe, expect, it } from 'vitest'
import { dropIndex } from '../../src/ui/dropInsert.ts'

describe('dropIndex', () => {
  const centers = [20, 60, 100]

  it('counts how many item centres the pointer has passed', () => {
    expect(dropIndex(centers, 0)).toBe(0)
    expect(dropIndex(centers, 21)).toBe(1)
    expect(dropIndex(centers, 80)).toBe(2)
    expect(dropIndex(centers, 500)).toBe(3)
  })

  it('handles an empty list', () => {
    expect(dropIndex([], 50)).toBe(0)
  })
})
