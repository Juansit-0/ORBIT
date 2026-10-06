import { describe, expect, it } from 'vitest'
import { blend, dominantColors } from '../../src/scene/palette.ts'

function pixels(colors: [number, number, number][], repeat = 1): Uint8ClampedArray {
  const data: number[] = []
  for (let i = 0; i < repeat; i++) for (const [r, g, b] of colors) data.push(r, g, b, 255)
  return new Uint8ClampedArray(data)
}

describe('dominantColors', () => {
  it('picks the most vivid hue over a grey background', () => {
    const data = pixels([...Array.from({ length: 30 }, () => [128, 128, 128] as [number, number, number]), [230, 40, 30], [220, 50, 35]])
    const { vivid } = dominantColors(data)
    expect(vivid[0]).toBeGreaterThan(0.8)
    expect(vivid[1]).toBeLessThan(0.25)
  })

  it('finds a dark tone', () => {
    const { deep } = dominantColors(pixels([[10, 20, 60], [240, 240, 240]], 10))
    expect(deep[2]).toBeGreaterThan(deep[0])
    expect(deep[2]).toBeLessThan(0.5)
  })

  it('falls back to the average for greyscale covers', () => {
    const { vivid } = dominantColors(pixels([[100, 100, 100], [200, 200, 200]], 5))
    expect(vivid[0]).toBeCloseTo(vivid[1], 5)
  })

  it('ignores transparent pixels and handles empty input', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 255, 255])
    expect(dominantColors(data).vivid[2]).toBeCloseTo(1, 2)
    expect(dominantColors(new Uint8ClampedArray()).vivid).toEqual([0.36, 0.66, 0.88])
  })
})

describe('blend', () => {
  it('mixes and caps lightness so particles stay visible on the light ground', () => {
    expect(blend([0, 0, 0], [1, 1, 1], 0.5)).toEqual([0.5, 0.5, 0.5])
    const capped = blend([1, 1, 1], [1, 1, 1], 1, 0.6)
    expect(0.2126 * capped[0] + 0.7152 * capped[1] + 0.0722 * capped[2]).toBeCloseTo(0.6, 5)
  })
})

import { buildTargets } from '../../src/scene/coverMorph.ts'

describe('buildTargets', () => {
  it('spreads particles over the cover grid inside -1..1 with matching colors', () => {
    const colors = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 1, 1])
    const { positions, colors: tints } = buildTargets(8, { grid: 2, colors })
    for (const value of positions) {
      expect(value).toBeGreaterThanOrEqual(-1)
      expect(value).toBeLessThanOrEqual(1)
    }
    expect(Array.from(tints.slice(0, 3))).toEqual([1, 0, 0])
    expect(Array.from(tints.slice(21, 24))).toEqual([1, 1, 1])
    expect(positions[0]).toBeLessThan(0)
    expect(positions[1]).toBeGreaterThan(0)
  })
})
