import { DoublyLinkedList } from './DoublyLinkedList.ts'
import type { ListNode } from './ListNode.ts'
import type { SongNode } from './SongNode.ts'
import type { RepeatMode, Song } from './types.ts'

export type PlaylistChange = 'add' | 'remove' | 'move' | 'select' | 'mode' | 'update' | 'restore' | 'clear'

export type PlaylistListener = (change: PlaylistChange, playlist: Playlist) => void

export interface PlaylistSnapshot {
  songs: Song[]
  currentIndex: number
  repeat: RepeatMode
  shuffle: boolean
}

export interface RemoveResult {
  song: Song
  wasCurrent: boolean
  current: SongNode | null
}

const REPEAT_CYCLE: readonly RepeatMode[] = ['off', 'all', 'one']

export class Playlist {
  readonly list = new DoublyLinkedList<Song>()
  current: SongNode | null = null
  repeat: RepeatMode = 'off'
  private order: DoublyLinkedList<SongNode> | null = null
  private readonly listeners = new Set<PlaylistListener>()
  private readonly random: () => number

  constructor(random: () => number = Math.random) {
    this.random = random
  }

  get size(): number {
    return this.list.size
  }

  get shuffle(): boolean {
    return this.order !== null
  }

  isEmpty(): boolean {
    return this.list.isEmpty()
  }

  subscribe(listener: PlaylistListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  addFirst(song: Song): SongNode {
    return this.afterInsert(this.list.addFirst(song))
  }

  addLast(song: Song): SongNode {
    return this.afterInsert(this.list.addLast(song))
  }

  insertAt(index: number, song: Song): SongNode {
    return this.afterInsert(this.list.insertAt(index, song))
  }

  insertNodeAt(index: number, node: SongNode): SongNode {
    return this.afterInsert(this.list.insertNodeAt(index, node))
  }

  remove(nodeId: string): RemoveResult | null {
    const node = this.list.findById(nodeId)
    if (!node) return null
    const wasCurrent = node === this.current
    if (wasCurrent) this.current = this.successorOf(node) ?? this.predecessorOf(node)
    if (this.order) {
      const entry = this.orderEntryOf(node)
      if (entry) this.order.removeNode(entry)
    }
    const song = this.list.removeNode(node)
    this.emit('remove')
    return { song, wasCurrent, current: this.current }
  }

  move(fromIndex: number, toIndex: number): void {
    this.list.move(fromIndex, toIndex)
    this.emit('move')
  }

  select(nodeId: string): SongNode | null {
    const node = this.list.findById(nodeId)
    if (!node) return null
    this.current = node
    this.emit('select')
    return node
  }

  updateSong(nodeId: string, patch: Partial<Song>): void {
    const node = this.list.findById(nodeId)
    if (!node) return
    node.value = { ...node.value, ...patch }
    this.emit('update')
  }

  indexOfCurrent(): number {
    return this.current ? this.list.indexOf(this.current) : -1
  }

  containsSong(songId: string): boolean {
    return this.list.findNode((song) => song.id === songId) !== null
  }

  hasNext(): boolean {
    if (this.isEmpty()) return false
    if (!this.current) return true
    return this.successorOf(this.current) !== null || this.repeat === 'all'
  }

  hasPrevious(): boolean {
    if (this.isEmpty()) return false
    if (!this.current) return true
    return this.predecessorOf(this.current) !== null || this.repeat === 'all'
  }

  peekNext(): SongNode | null {
    if (this.isEmpty()) return null
    if (!this.current) return this.firstNode()
    return this.successorOf(this.current) ?? (this.repeat === 'all' ? this.firstNode() : null)
  }

  peekPrevious(): SongNode | null {
    if (this.isEmpty()) return null
    if (!this.current) return this.lastNode()
    return this.predecessorOf(this.current) ?? (this.repeat === 'all' ? this.lastNode() : null)
  }

  next(): SongNode | null {
    if (this.isEmpty()) return null
    const target = this.current
      ? (this.successorOf(this.current) ?? (this.repeat === 'all' ? this.firstNode() : null))
      : this.firstNode()
    if (!target) return null
    this.current = target
    this.emit('select')
    return target
  }

  previous(): SongNode | null {
    if (this.isEmpty()) return null
    const target = this.current
      ? (this.predecessorOf(this.current) ?? (this.repeat === 'all' ? this.lastNode() : null))
      : this.lastNode()
    if (!target) return null
    this.current = target
    this.emit('select')
    return target
  }

  advanceAfterEnd(): SongNode | null {
    if (!this.current) return null
    if (this.repeat === 'one') {
      this.emit('select')
      return this.current
    }
    return this.next()
  }

  setRepeat(mode: RepeatMode): void {
    this.repeat = mode
    this.emit('mode')
  }

  cycleRepeat(): RepeatMode {
    const index = REPEAT_CYCLE.indexOf(this.repeat)
    this.setRepeat(REPEAT_CYCLE[(index + 1) % REPEAT_CYCLE.length] as RepeatMode)
    return this.repeat
  }

  setShuffle(enabled: boolean): void {
    if (enabled === this.shuffle) return
    this.order = enabled ? this.buildShuffleOrder() : null
    this.emit('mode')
  }

  toggleShuffle(): boolean {
    this.setShuffle(!this.shuffle)
    return this.shuffle
  }

  playOrder(): SongNode[] {
    return this.order ? this.order.toArray() : this.list.nodes()
  }

  clear(): void {
    this.list.clear()
    this.order?.clear()
    this.current = null
    this.emit('clear')
  }

  snapshot(): PlaylistSnapshot {
    return {
      songs: this.list.toArray(),
      currentIndex: this.indexOfCurrent(),
      repeat: this.repeat,
      shuffle: this.shuffle,
    }
  }

  restore(snapshot: PlaylistSnapshot): void {
    this.list.clear()
    this.order = null
    for (const song of snapshot.songs) {
      const { unavailable, ...rest } = song
      void unavailable
      this.list.addLast(rest)
    }
    this.current = this.list.getNode(snapshot.currentIndex)
    this.repeat = REPEAT_CYCLE.includes(snapshot.repeat) ? snapshot.repeat : 'off'
    if (snapshot.shuffle) this.order = this.buildShuffleOrder()
    this.emit('restore')
  }

  private afterInsert(node: SongNode): SongNode {
    if (this.order) {
      const anchor = this.current ? this.orderEntryOf(this.current) : null
      const start = anchor ? this.order.indexOf(anchor) + 1 : 0
      const index = start + Math.floor(this.random() * (this.order.size - start + 1))
      this.order.insertAt(index, node)
    }
    this.emit('add')
    return node
  }

  private buildShuffleOrder(): DoublyLinkedList<SongNode> {
    const rest = this.list.nodes().filter((node) => node !== this.current)
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1))
      const swap = rest[i] as SongNode
      rest[i] = rest[j] as SongNode
      rest[j] = swap
    }
    const order = new DoublyLinkedList<SongNode>()
    if (this.current) order.addLast(this.current)
    for (const node of rest) order.addLast(node)
    return order
  }

  private orderEntryOf(node: SongNode): ListNode<SongNode> | null {
    return this.order ? this.order.findNode((value) => value === node) : null
  }

  private successorOf(node: SongNode): SongNode | null {
    if (!this.order) return node.next
    return this.orderEntryOf(node)?.next?.value ?? null
  }

  private predecessorOf(node: SongNode): SongNode | null {
    if (!this.order) return node.prev
    return this.orderEntryOf(node)?.prev?.value ?? null
  }

  private firstNode(): SongNode | null {
    return this.order ? (this.order.head?.value ?? null) : this.list.head
  }

  private lastNode(): SongNode | null {
    return this.order ? (this.order.tail?.value ?? null) : this.list.tail
  }

  private emit(change: PlaylistChange): void {
    for (const listener of this.listeners) listener(change, this)
  }
}
