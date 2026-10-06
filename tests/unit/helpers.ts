import { expect } from 'vitest'
import type { DoublyLinkedList } from '../../src/core/DoublyLinkedList.ts'
import type { Song } from '../../src/core/types.ts'

export function expectIntegrity<T>(list: DoublyLinkedList<T>): void {
  const forward = list.nodes()
  expect(forward.length).toBe(list.size)
  expect(list.head?.prev ?? null).toBeNull()
  expect(list.tail?.next ?? null).toBeNull()
  if (list.size === 0) {
    expect(list.head).toBeNull()
    expect(list.tail).toBeNull()
    return
  }
  expect(forward[0]).toBe(list.head)
  expect(forward[forward.length - 1]).toBe(list.tail)
  forward.forEach((node, index) => {
    expect(node.prev).toBe(forward[index - 1] ?? null)
    expect(node.next).toBe(forward[index + 1] ?? null)
  })
  expect(list.toArrayReversed()).toEqual([...list.toArray()].reverse())
}

export function song(id: string): Song {
  return {
    id,
    title: `Title ${id}`,
    artist: `Artist ${id}`,
    album: `Album ${id}`,
    artworkUrl: `https://example.com/${id}.jpg`,
    durationMs: 180000,
  }
}

export function sequenceRandom(values: number[]): () => number {
  let index = 0
  return () => {
    const value = values[index % values.length] ?? 0
    index += 1
    return value
  }
}
