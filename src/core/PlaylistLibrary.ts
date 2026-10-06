import { DoublyLinkedList } from './DoublyLinkedList.ts'
import { createNodeId } from './ListNode.ts'
import type { Playlist, PlaylistSnapshot } from './Playlist.ts'

export interface LibraryEntry {
  id: string
  name: string
  snapshot: PlaylistSnapshot
}

export interface LibraryState {
  activeId: string
  entries: LibraryEntry[]
}

export type LibraryResult = { ok: true; entry: LibraryEntry } | { ok: false; error: string }

export type LibraryListener = (library: PlaylistLibrary) => void

export const MAX_NAME_LENGTH = 40

const EMPTY: PlaylistSnapshot = { songs: [], currentIndex: -1, repeat: 'off', shuffle: false }

export class PlaylistLibrary {
  readonly entries = new DoublyLinkedList<LibraryEntry>()
  private readonly playlist: Playlist
  private readonly listeners = new Set<LibraryListener>()
  private activeEntryId: string

  constructor(playlist: Playlist, state: LibraryState | null, defaultName = 'My flight plan') {
    this.playlist = playlist
    const valid = state?.entries.filter((entry) => entry.id && entry.name && entry.snapshot) ?? []
    for (const entry of valid) this.entries.addLast({ ...entry })
    if (this.entries.isEmpty()) this.entries.addLast({ id: createNodeId(), name: defaultName, snapshot: playlist.snapshot() })
    const active = this.entries.findNode((entry) => entry.id === state?.activeId) ?? this.entries.head
    this.activeEntryId = (active?.value as LibraryEntry).id
    if (valid.length > 0) this.playlist.restore(this.active.snapshot)
  }

  get activeId(): string {
    return this.activeEntryId
  }

  get active(): LibraryEntry {
    return (this.entries.findNode((entry) => entry.id === this.activeEntryId)?.value ?? this.entries.head?.value) as LibraryEntry
  }

  get size(): number {
    return this.entries.size
  }

  list(): LibraryEntry[] {
    this.capture()
    return this.entries.toArray()
  }

  subscribe(listener: LibraryListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  validateName(raw: string, excludeId?: string): string | null {
    const name = raw.trim().replace(/\s+/g, ' ')
    if (name.length === 0) return 'Give the playlist a name.'
    if (name.length > MAX_NAME_LENGTH) return `Keep the name under ${MAX_NAME_LENGTH + 1} characters.`
    const taken = this.entries.findNode((entry) => entry.id !== excludeId && entry.name.toLowerCase() === name.toLowerCase())
    return taken ? `A playlist named “${taken.value.name}” already exists.` : null
  }

  uniqueName(raw: string): string {
    const base = raw.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH - 3) || 'Playlist'
    if (!this.validateName(base)) return base
    for (let n = 2; n < 1000; n++) {
      const candidate = `${base} ${n}`
      if (!this.validateName(candidate)) return candidate
    }
    return `${base} ${Date.now() % 1000}`
  }

  create(raw: string, switchTo = true): LibraryResult {
    const error = this.validateName(raw)
    if (error) return { ok: false, error }
    const entry: LibraryEntry = { id: createNodeId(), name: raw.trim().replace(/\s+/g, ' '), snapshot: { ...EMPTY } }
    this.entries.addLast(entry)
    if (switchTo) this.switchTo(entry.id)
    else this.emit()
    return { ok: true, entry }
  }

  rename(id: string, raw: string): LibraryResult {
    const node = this.entries.findNode((entry) => entry.id === id)
    if (!node) return { ok: false, error: 'That playlist no longer exists.' }
    const error = this.validateName(raw, id)
    if (error) return { ok: false, error }
    node.value.name = raw.trim().replace(/\s+/g, ' ')
    this.emit()
    return { ok: true, entry: node.value }
  }

  remove(id: string): LibraryResult {
    const node = this.entries.findNode((entry) => entry.id === id)
    if (!node) return { ok: false, error: 'That playlist no longer exists.' }
    if (this.entries.size === 1) return { ok: false, error: 'Keep at least one playlist.' }
    const neighbor = (node.next ?? node.prev)?.value as LibraryEntry
    const wasActive = id === this.activeEntryId
    this.entries.removeNode(node)
    if (wasActive) {
      this.activeEntryId = neighbor.id
      this.playlist.restore(neighbor.snapshot)
    }
    this.emit()
    return { ok: true, entry: node.value }
  }

  switchTo(id: string): LibraryResult {
    const node = this.entries.findNode((entry) => entry.id === id)
    if (!node) return { ok: false, error: 'That playlist no longer exists.' }
    if (id !== this.activeEntryId) {
      this.capture()
      this.activeEntryId = id
      this.playlist.restore(node.value.snapshot)
    }
    this.emit()
    return { ok: true, entry: node.value }
  }

  state(): LibraryState {
    this.capture()
    return { activeId: this.activeEntryId, entries: this.entries.toArray() }
  }

  private capture(): void {
    const node = this.entries.findNode((entry) => entry.id === this.activeEntryId)
    if (node) node.value.snapshot = this.playlist.snapshot()
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this)
  }
}
