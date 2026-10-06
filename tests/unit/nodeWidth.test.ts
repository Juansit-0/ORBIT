import { describe, expect, it } from 'vitest'
import { nodeGrow } from '../../src/ui/NodeVisualizer.ts'

describe('nodeGrow', () => {
  it('grows with duration inside the bounds', () => {
    expect(nodeGrow(0)).toBe(1)
    expect(nodeGrow(180000)).toBe(3)
    expect(nodeGrow(3600000)).toBe(4)
    expect(nodeGrow(210000)).toBeGreaterThan(nodeGrow(200000))
  })
})
