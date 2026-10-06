import { describe, expect, it } from 'vitest'
import { diffOrder, explainOperation, walkCost, type Entry } from '../../src/core/explain.ts'

const e = (id: string): Entry => ({ id, title: id.toUpperCase() })
const list = (...ids: string[]) => ids.map(e)

describe('diffOrder', () => {
  it('detects inserts at the head, middle and tail', () => {
    expect(diffOrder(list('a', 'b'), list('x', 'a', 'b'))).toMatchObject({ kind: 'insert', index: 0, prev: null, next: { id: 'a' } })
    expect(diffOrder(list('a', 'b'), list('a', 'x', 'b'))).toMatchObject({ kind: 'insert', index: 1, prev: { id: 'a' }, next: { id: 'b' } })
    expect(diffOrder(list('a', 'b'), list('a', 'b', 'x'))).toMatchObject({ kind: 'insert', index: 2, next: null })
    expect(diffOrder([], list('x'))).toMatchObject({ kind: 'insert', index: 0, prev: null, next: null })
  })

  it('detects removals with their old neighbours', () => {
    expect(diffOrder(list('a', 'b', 'c'), list('a', 'c'))).toMatchObject({ kind: 'remove', node: { id: 'b' }, prev: { id: 'a' }, next: { id: 'c' } })
    expect(diffOrder(list('a'), [])).toMatchObject({ kind: 'remove', prev: null, next: null })
  })

  it('detects a single move in either direction', () => {
    expect(diffOrder(list('a', 'b', 'c', 'd'), list('b', 'c', 'a', 'd'))).toMatchObject({ kind: 'move', node: { id: 'a' }, from: 0, to: 2 })
    expect(diffOrder(list('a', 'b', 'c', 'd'), list('a', 'd', 'b', 'c'))).toMatchObject({ kind: 'move', node: { id: 'd' }, from: 3, to: 1 })
  })

  it('returns null when nothing changed or the change is not a single operation', () => {
    expect(diffOrder(list('a', 'b'), list('a', 'b'))).toBeNull()
    expect(diffOrder(list('a', 'b', 'c', 'd'), list('b', 'a', 'd', 'c'))).toBeNull()
    expect(diffOrder(list('a'), list('a', 'b', 'c'))).toBeNull()
  })
})

describe('explainOperation', () => {
  it('lists the four pointer updates of a middle insert', () => {
    const steps = explainOperation({ kind: 'insert', node: e('x'), index: 1, prev: e('a'), next: e('b'), size: 3 })
    expect(steps.map((step) => step.text)).toEqual([
      'insertAt(1) · O(1) at the head'.replace('O(1) at the head', walkCost(1, 3)),
      'new.prev = “A”',
      'new.next = “B”',
      '“A”.next = new',
      '“B”.prev = new',
    ])
    expect(steps[3]?.link).toEqual({ left: 'a', right: 'x', arrow: 'next' })
  })

  it('updates head and tail when inserting into an empty list', () => {
    const steps = explainOperation({ kind: 'insert', node: e('x'), index: 0, prev: null, next: null, size: 1 })
    expect(steps.slice(3).map((step) => step.tag)).toEqual(['head', 'tail'])
  })

  it('explains removals including the head', () => {
    const steps = explainOperation({ kind: 'remove', node: e('a'), index: 0, prev: null, next: e('b'), size: 2 })
    expect(steps[1]).toMatchObject({ text: 'head = “B”', tag: 'head' })
    expect(steps.at(-1)?.text).toBe('“A”.prev = “A”.next = null')
  })

  it('explains moves', () => {
    expect(explainOperation({ kind: 'move', node: e('a'), from: 0, to: 2, size: 3 })).toHaveLength(3)
  })
})

describe('walkCost', () => {
  it('reports constant time at the ends and the shorter walk in the middle', () => {
    expect(walkCost(0, 10)).toBe('O(1) at the head')
    expect(walkCost(9, 10)).toBe('O(1) at the tail')
    expect(walkCost(2, 10)).toBe('O(n): walked 2 nodes from HEAD')
    expect(walkCost(8, 10)).toBe('O(1) at the tail'.replace('O(1) at the tail', 'O(n): walked 1 node from TAIL'))
  })
})
