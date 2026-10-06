import { describe, expect, it } from 'vitest'
import { groupTogether, rankCommands, scoreCommand } from '../../src/ui/commandRank.ts'

const items = [
  { label: 'Shuffle on', keywords: 'random order' },
  { label: 'Repeat all', keywords: 'loop' },
  { label: 'Undo', keywords: 'back revert' },
  { label: 'Play Bohemian Rhapsody', keywords: 'Queen' },
  { label: 'Player mode', keywords: 'cinema fullscreen focus' },
]

describe('command ranking', () => {
  it('prefers prefix matches over word and keyword matches', () => {
    expect(rankCommands('pla', items, 5).map((i) => i.label)).toEqual(['Player mode', 'Play Bohemian Rhapsody'])
    expect(rankCommands('queen', items, 5)[0]?.label).toBe('Play Bohemian Rhapsody')
    expect(rankCommands('loop', items, 5)[0]?.label).toBe('Repeat all')
  })

  it('supports multiple words and loose subsequences', () => {
    expect(scoreCommand('bohemian queen', items[3]!)).toBeGreaterThan(0)
    expect(scoreCommand('shf', items[0]!)).toBe(10)
    expect(scoreCommand('zzz', items[0]!)).toBe(0)
    expect(scoreCommand('dft', { label: 'Blinding Lights', keywords: 'The Weeknd After Hours daft' })).toBe(0)
    expect(scoreCommand('sh', items[0]!)).toBe(100 - 'shuffle on'.length / 100)
  })

  it('keeps groups together in order of their best result', () => {
    const grouped = groupTogether([{ g: 'b', n: 1 }, { g: 'a', n: 2 }, { g: 'b', n: 3 }], (item) => item.g)
    expect(grouped.map((item) => item.n)).toEqual([1, 3, 2])
  })

  it('keeps the original order for an empty query and honours the limit', () => {
    expect(rankCommands('', items, 2).map((i) => i.label)).toEqual(['Shuffle on', 'Repeat all'])
  })
})
