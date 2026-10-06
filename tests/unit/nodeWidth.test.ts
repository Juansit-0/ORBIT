import { describe, expect, it } from 'vitest'
import { nodeWidth } from '../../src/ui/NodeVisualizer.ts'

describe('nodeWidth', () => {
  it('grows with duration inside the bounds', () => {
    expect(nodeWidth(0)).toBe(104)
    expect(nodeWidth(360000)).toBe(151)
    expect(nodeWidth(3600000)).toBe(196)
    expect(nodeWidth(300000)).toBeGreaterThan(nodeWidth(250000))
  })
})
