import { ListNode } from './ListNode.ts'

export class DoublyLinkedList<T> implements Iterable<T> {
  head: ListNode<T> | null = null
  tail: ListNode<T> | null = null
  private count = 0

  get size(): number {
    return this.count
  }

  isEmpty(): boolean {
    return this.count === 0
  }

  addFirst(value: T): ListNode<T> {
    const node = new ListNode(value)
    this.linkFirst(node)
    return node
  }

  addLast(value: T): ListNode<T> {
    const node = new ListNode(value)
    this.linkLast(node)
    return node
  }

  insertAt(index: number, value: T): ListNode<T> {
    this.assertIndex(index, this.count)
    const node = new ListNode(value)
    this.linkAt(index, node)
    return node
  }

  insertNodeAt(index: number, node: ListNode<T>): ListNode<T> {
    this.assertIndex(index, this.count)
    if (node.prev || node.next || this.head === node) throw new Error('Node is already linked')
    this.linkAt(index, node)
    return node
  }

  getNode(index: number): ListNode<T> | null {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) return null
    if (index < this.count / 2) {
      let cursor = this.head
      for (let i = 0; i < index && cursor; i++) cursor = cursor.next
      return cursor
    }
    let cursor = this.tail
    for (let i = this.count - 1; i > index && cursor; i--) cursor = cursor.prev
    return cursor
  }

  get(index: number): T | undefined {
    return this.getNode(index)?.value
  }

  findNode(predicate: (value: T, node: ListNode<T>) => boolean): ListNode<T> | null {
    for (let cursor = this.head; cursor; cursor = cursor.next) {
      if (predicate(cursor.value, cursor)) return cursor
    }
    return null
  }

  findById(id: string): ListNode<T> | null {
    return this.findNode((_, node) => node.id === id)
  }

  indexOf(node: ListNode<T>): number {
    let index = 0
    for (let cursor = this.head; cursor; cursor = cursor.next) {
      if (cursor === node) return index
      index += 1
    }
    return -1
  }

  indexOfId(id: string): number {
    const node = this.findById(id)
    return node ? this.indexOf(node) : -1
  }

  contains(node: ListNode<T>): boolean {
    return this.indexOf(node) !== -1
  }

  removeAt(index: number): T {
    this.assertIndex(index, this.count - 1)
    const node = this.getNode(index) as ListNode<T>
    this.unlink(node)
    return node.value
  }

  removeNode(node: ListNode<T>): T {
    if (!this.contains(node)) throw new Error('Node does not belong to this list')
    this.unlink(node)
    return node.value
  }

  removeById(id: string): T | null {
    const node = this.findById(id)
    if (!node) return null
    this.unlink(node)
    return node.value
  }

  removeFirst(): T | null {
    return this.head ? this.removeNode(this.head) : null
  }

  removeLast(): T | null {
    return this.tail ? this.removeNode(this.tail) : null
  }

  move(fromIndex: number, toIndex: number): void {
    this.assertIndex(fromIndex, this.count - 1)
    this.assertIndex(toIndex, this.count - 1)
    if (fromIndex === toIndex) return
    const node = this.getNode(fromIndex) as ListNode<T>
    this.unlink(node)
    this.linkAt(toIndex, node)
  }

  moveNode(node: ListNode<T>, toIndex: number): void {
    const fromIndex = this.indexOf(node)
    if (fromIndex === -1) throw new Error('Node does not belong to this list')
    this.move(fromIndex, toIndex)
  }

  clear(): void {
    let cursor = this.head
    while (cursor) {
      const next = cursor.next
      cursor.prev = null
      cursor.next = null
      cursor = next
    }
    this.head = null
    this.tail = null
    this.count = 0
  }

  nodes(): ListNode<T>[] {
    const result: ListNode<T>[] = []
    for (let cursor = this.head; cursor; cursor = cursor.next) result.push(cursor)
    return result
  }

  toArray(): T[] {
    return this.nodes().map((node) => node.value)
  }

  toArrayReversed(): T[] {
    const result: T[] = []
    for (let cursor = this.tail; cursor; cursor = cursor.prev) result.push(cursor.value)
    return result
  }

  *[Symbol.iterator](): Iterator<T> {
    for (let cursor = this.head; cursor; cursor = cursor.next) yield cursor.value
  }

  private linkFirst(node: ListNode<T>): void {
    node.prev = null
    node.next = this.head
    if (this.head) this.head.prev = node
    else this.tail = node
    this.head = node
    this.count += 1
  }

  private linkLast(node: ListNode<T>): void {
    node.next = null
    node.prev = this.tail
    if (this.tail) this.tail.next = node
    else this.head = node
    this.tail = node
    this.count += 1
  }

  private linkAt(index: number, node: ListNode<T>): void {
    if (index === 0) return this.linkFirst(node)
    if (index === this.count) return this.linkLast(node)
    const successor = this.getNode(index) as ListNode<T>
    const predecessor = successor.prev as ListNode<T>
    node.prev = predecessor
    node.next = successor
    predecessor.next = node
    successor.prev = node
    this.count += 1
  }

  private unlink(node: ListNode<T>): void {
    if (node.prev) node.prev.next = node.next
    else this.head = node.next
    if (node.next) node.next.prev = node.prev
    else this.tail = node.prev
    node.prev = null
    node.next = null
    this.count -= 1
  }

  private assertIndex(index: number, max: number): void {
    if (!Number.isInteger(index) || index < 0 || index > max) {
      throw new RangeError(`Index ${index} is out of bounds (0..${max})`)
    }
  }
}
