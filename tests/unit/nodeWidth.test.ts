import { describe, expect, it } from 'vitest'
import { nodeGrow } from '../../src/ui/NodeVisualizer.ts'

describe('nodeGrow', () => {
  it('is proportional to duration inside the bounds', () => {
    expect(nodeGrow(0)).toBe(0.5)
    expect(nodeGrow(180000)).toBe(3)
    expect(nodeGrow(369000)).toBeCloseTo(6.15, 2)
    expect(nodeGrow(3600000)).toBe(10)
    expect(nodeGrow(369000) / nodeGrow(200000)).toBeGreaterThan(1.8)
  })
})
