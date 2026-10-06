import type { Song } from '../core/types.ts'
import { readJson, writeJson } from './storage.ts'

const HISTORY_KEY = 'orbit:v1:history'
export const HISTORY_LIMIT = 50
export const LISTENED_MS = 10000

export interface HistoryEntry {
  song: Song
  playedAt: number
}

export interface HistoryStore {
  read: () => unknown
  write: (entries: HistoryEntry[]) => void
}

export const localHistoryStore: HistoryStore = {
  read: () => readJson<unknown>(HISTORY_KEY),
  write: (entries) => writeJson(HISTORY_KEY, entries),
}

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<HistoryEntry>
  return typeof entry.playedAt === 'number' && typeof entry.song?.id === 'string' && typeof entry.song.title === 'string'
}

export function withPlay(entries: HistoryEntry[], song: Song, playedAt: number, limit = HISTORY_LIMIT): HistoryEntry[] {
  const clean: Song = { ...song }
  delete clean.unavailable
  return [{ song: clean, playedAt }, ...entries.filter((entry) => entry.song.id !== song.id)].slice(0, limit)
}

export interface ListenSample {
  song: Song | null
  playing: boolean
  currentMs: number
}

export class PlayHistory {
  private list: HistoryEntry[]
  private readonly store: HistoryStore
  private readonly listeners = new Set<() => void>()
  private listeningTo: string | null = null
  private counted = false

  constructor(store: HistoryStore = localHistoryStore) {
    this.store = store
    const saved = store.read()
    this.list = Array.isArray(saved) ? saved.filter(isEntry).slice(0, HISTORY_LIMIT) : []
  }

  entries(): readonly HistoryEntry[] {
    return this.list
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  record(song: Song, playedAt: number): void {
    this.list = withPlay(this.list, song, playedAt)
    this.store.write(this.list)
    for (const listener of this.listeners) listener()
  }

  clear(): void {
    this.list = []
    this.store.write(this.list)
    for (const listener of this.listeners) listener()
  }

  observe(sample: ListenSample, now: number): void {
    const id = sample.song?.id ?? null
    if (id !== this.listeningTo) {
      this.listeningTo = id
      this.counted = false
    }
    if (!sample.song || this.counted || !sample.playing || sample.currentMs < LISTENED_MS) return
    this.counted = true
    this.record(sample.song, now)
  }
}
