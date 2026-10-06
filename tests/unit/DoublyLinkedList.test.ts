import { beforeEach, describe, expect, it } from 'vitest'
import { DoublyLinkedList } from '../../src/core/DoublyLinkedList.ts'
import { expectIntegrity } from './helpers.ts'

function listOf(...values: string[]): DoublyLinkedList<string> {
  const list = new DoublyLinkedList<string>()
  for (const value of values) list.addLast(value)
  return list
}

describe('DoublyLinkedList', () => {
  let list: DoublyLinkedList<string>

  beforeEach(() => {
    list = new DoublyLinkedList<string>()
  })

  describe('empty list', () => {
    it('has no head, tail or elements', () => {
      expect(list.size).toBe(0)
      expect(list.isEmpty()).toBe(true)
      expect(list.toArray()).toEqual([])
      expectIntegrity(list)
    })

    it('returns null when removing from either end', () => {
      expect(list.removeFirst()).toBeNull()
      expect(list.removeLast()).toBeNull()
    })

    it('returns undefined and null for lookups', () => {
      expect(list.get(0)).toBeUndefined()
      expect(list.getNode(0)).toBeNull()
      expect(list.findById('missing')).toBeNull()
      expect(list.removeById('missing')).toBeNull()
    })

    it('rejects removeAt and move', () => {
      expect(() => list.removeAt(0)).toThrow(RangeError)
      expect(() => list.move(0, 0)).toThrow(RangeError)
    })
  })

  describe('addFirst', () => {
    it('sets head and tail on the first element', () => {
      const node = list.addFirst('a')
      expect(list.head).toBe(node)
      expect(list.tail).toBe(node)
      expectIntegrity(list)
    })

    it('prepends and keeps the tail', () => {
      list.addFirst('b')
      list.addFirst('a')
      expect(list.toArray()).toEqual(['a', 'b'])
      expect(list.tail?.value).toBe('b')
      expectIntegrity(list)
    })
  })

  describe('addLast', () => {
    it('appends and keeps the head', () => {
      list.addLast('a')
      list.addLast('b')
      list.addLast('c')
      expect(list.toArray()).toEqual(['a', 'b', 'c'])
      expect(list.head?.value).toBe('a')
      expectIntegrity(list)
    })
  })

  describe('insertAt', () => {
    it('inserts into an empty list at index 0', () => {
      list.insertAt(0, 'a')
      expect(list.toArray()).toEqual(['a'])
      expectIntegrity(list)
    })

    it('inserts at the head', () => {
      list = listOf('b', 'c')
      list.insertAt(0, 'a')
      expect(list.toArray()).toEqual(['a', 'b', 'c'])
      expectIntegrity(list)
    })

    it('inserts at the tail when index equals size', () => {
      list = listOf('a', 'b')
      list.insertAt(2, 'c')
      expect(list.toArray()).toEqual(['a', 'b', 'c'])
      expect(list.tail?.value).toBe('c')
      expectIntegrity(list)
    })

    it('inserts in the middle', () => {
      list = listOf('a', 'b', 'd', 'e')
      list.insertAt(2, 'c')
      expect(list.toArray()).toEqual(['a', 'b', 'c', 'd', 'e'])
      expectIntegrity(list)
    })

    it.each([-1, 4, 1.5, Number.NaN])('rejects index %s without modifying the list', (index) => {
      list = listOf('a', 'b', 'c')
      expect(() => list.insertAt(index, 'x')).toThrow(RangeError)
      expect(list.toArray()).toEqual(['a', 'b', 'c'])
      expectIntegrity(list)
    })
  })

  describe('getNode', () => {
    it('finds every index walking from the closest end', () => {
      list = listOf('a', 'b', 'c', 'd', 'e')
      expect([0, 1, 2, 3, 4].map((i) => list.get(i))).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('returns null outside the bounds', () => {
      list = listOf('a')
      expect(list.getNode(-1)).toBeNull()
      expect(list.getNode(1)).toBeNull()
    })
  })

  describe('removal', () => {
    it('removes the only element', () => {
      list = listOf('a')
      expect(list.removeAt(0)).toBe('a')
      expectIntegrity(list)
      expect(list.isEmpty()).toBe(true)
    })

    it('removes the head', () => {
      list = listOf('a', 'b', 'c')
      expect(list.removeFirst()).toBe('a')
      expect(list.head?.value).toBe('b')
      expectIntegrity(list)
    })

    it('removes the tail', () => {
      list = listOf('a', 'b', 'c')
      expect(list.removeLast()).toBe('c')
      expect(list.tail?.value).toBe('b')
      expectIntegrity(list)
    })

    it('removes from the middle', () => {
      list = listOf('a', 'b', 'c')
      expect(list.removeAt(1)).toBe('b')
      expect(list.toArray()).toEqual(['a', 'c'])
      expectIntegrity(list)
    })

    it('removes by id and detaches the node', () => {
      list = listOf('a', 'b', 'c')
      const node = list.getNode(1)!
      expect(list.removeById(node.id)).toBe('b')
      expect(node.prev).toBeNull()
      expect(node.next).toBeNull()
      expectIntegrity(list)
    })

    it('rejects removing a node from another list', () => {
      const other = listOf('x')
      list = listOf('a')
      expect(() => list.removeNode(other.head!)).toThrow()
      expectIntegrity(list)
    })

    it('rejects removeAt out of bounds', () => {
      list = listOf('a', 'b')
      expect(() => list.removeAt(2)).toThrow(RangeError)
      expect(list.size).toBe(2)
    })
  })

  describe('move', () => {
    it.each([
      [0, 3, ['b', 'c', 'd', 'a']],
      [3, 0, ['d', 'a', 'b', 'c']],
      [1, 2, ['a', 'c', 'b', 'd']],
      [2, 1, ['a', 'c', 'b', 'd']],
      [1, 1, ['a', 'b', 'c', 'd']],
    ])('moves from %i to %i', (from, to, expected) => {
      list = listOf('a', 'b', 'c', 'd')
      const node = list.getNode(from)!
      list.move(from, to)
      expect(list.toArray()).toEqual(expected)
      expect(list.getNode(to)).toBe(node)
      expectIntegrity(list)
    })

    it('moves a node by reference', () => {
      list = listOf('a', 'b', 'c')
      list.moveNode(list.head!, 2)
      expect(list.toArray()).toEqual(['b', 'c', 'a'])
      expectIntegrity(list)
    })

    it('rejects out of bounds targets', () => {
      list = listOf('a', 'b')
      expect(() => list.move(0, 2)).toThrow(RangeError)
      expect(list.toArray()).toEqual(['a', 'b'])
    })
  })

  describe('queries', () => {
    it('reports indexes and membership', () => {
      list = listOf('a', 'b', 'c')
      const node = list.getNode(2)!
      expect(list.indexOf(node)).toBe(2)
      expect(list.indexOfId(node.id)).toBe(2)
      expect(list.indexOfId('missing')).toBe(-1)
      expect(list.contains(node)).toBe(true)
    })

    it('is iterable', () => {
      list = listOf('a', 'b')
      expect([...list]).toEqual(['a', 'b'])
    })

    it('gives every node a unique id', () => {
      list = listOf('a', 'a', 'a')
      expect(new Set(list.nodes().map((n) => n.id)).size).toBe(3)
    })
  })

  it('clears every link', () => {
    list = listOf('a', 'b', 'c')
    const nodes = list.nodes()
    list.clear()
    expectIntegrity(list)
    for (const node of nodes) {
      expect(node.prev).toBeNull()
      expect(node.next).toBeNull()
    }
  })

  it('keeps integrity through a long random sequence', () => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const mirror: number[] = []
    const numbers = new DoublyLinkedList<number>()
    for (let step = 0; step < 500; step++) {
      const action = Math.floor(random() * 5)
      const value = step
      if (action === 0) {
        numbers.addFirst(value)
        mirror.unshift(value)
      } else if (action === 1) {
        numbers.addLast(value)
        mirror.push(value)
      } else if (action === 2) {
        const index = Math.floor(random() * (mirror.length + 1))
        numbers.insertAt(index, value)
        mirror.splice(index, 0, value)
      } else if (action === 3 && mirror.length > 0) {
        const index = Math.floor(random() * mirror.length)
        expect(numbers.removeAt(index)).toBe(mirror.splice(index, 1)[0])
      } else if (action === 4 && mirror.length > 1) {
        const from = Math.floor(random() * mirror.length)
        const to = Math.floor(random() * mirror.length)
        numbers.move(from, to)
        const [moved] = mirror.splice(from, 1)
        mirror.splice(to, 0, moved as number)
      }
      expect(numbers.toArray()).toEqual(mirror)
    }
    expectIntegrity(numbers)
  })
})

describe('insertNodeAt', () => {
  it('relinks a detached node at the same place', () => {
    const list = new DoublyLinkedList<string>()
    for (const value of ['a', 'b', 'c']) list.addLast(value)
    const node = list.getNode(1)!
    list.removeNode(node)
    list.insertNodeAt(1, node)
    expect(list.toArray()).toEqual(['a', 'b', 'c'])
    expect(list.getNode(1)).toBe(node)
    expectIntegrity(list)
  })

  it('rejects a node that is still linked', () => {
    const list = new DoublyLinkedList<string>()
    list.addLast('a')
    list.addLast('b')
    expect(() => list.insertNodeAt(0, list.tail!)).toThrow()
    expect(() => list.insertNodeAt(0, list.head!)).toThrow()
    expectIntegrity(list)
  })
})
