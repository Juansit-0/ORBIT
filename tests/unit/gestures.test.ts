import { describe, expect, it } from 'vitest'
import { classifySwipe, isLongPress } from '../../src/ui/gestures.ts'

describe('classifySwipe', () => {
  it('detects quick horizontal swipes', () => {
    expect(classifySwipe(-120, 10, 200)).toBe('left')
    expect(classifySwipe(90, -20, 250)).toBe('right')
  })

  it('ignores short, vertical or very slow drags', () => {
    expect(classifySwipe(30, 0, 100)).toBeNull()
    expect(classifySwipe(80, 100, 200)).toBeNull()
    expect(classifySwipe(70, 0, 1500)).toBeNull()
  })
})

describe('isLongPress', () => {
  it('needs a steady hold of about half a second', () => {
    expect(isLongPress(500, 3)).toBe(true)
    expect(isLongPress(300, 0)).toBe(false)
    expect(isLongPress(700, 20)).toBe(false)
  })
})
