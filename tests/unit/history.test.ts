import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, PlayHistory, withPlay, type HistoryEntry, type HistoryStore } from '../../src/services/history.ts'
import type { Song } from '../../src/core/types.ts'

function song(id: string): Song {
  return { id, title: `Song ${id}`, artist: 'Artist', album: 'Album', artworkUrl: 'cover', durationMs: 200000 }
}

function memory(initial: unknown = null): HistoryStore & { saved: HistoryEntry[] | null } {
  const box = {
    saved: null as HistoryEntry[] | null,
    read: () => initial,
    write: (entries: HistoryEntry[]) => {
      box.saved = entries
    },
  }
  return box
}

describe('withPlay', () => {
  it('puts the newest play first and keeps one entry per song', () => {
    let entries: HistoryEntry[] = []
    entries = withPlay(entries, song('a'), 1)
    entries = withPlay(entries, song('b'), 2)
    entries = withPlay(entries, song('a'), 3)
    expect(entries.map((entry) => [entry.song.id, entry.playedAt])).toEqual([['a', 3], ['b', 2]])
  })

  it('keeps at most the limit and drops the unavailable flag', () => {
    let entries: HistoryEntry[] = []
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) entries = withPlay(entries, { ...song(String(i)), unavailable: true }, i)
    expect(entries).toHaveLength(HISTORY_LIMIT)
    expect(entries[0]?.song.id).toBe(String(HISTORY_LIMIT + 4))
    expect(entries[0]?.song.unavailable).toBeUndefined()
  })
})

describe('PlayHistory', () => {
  it('counts a song once it has played for ten seconds', () => {
    const store = memory()
    const history = new PlayHistory(store)
    history.observe({ song: song('a'), playing: true, currentMs: 9000 }, 1)
    expect(history.entries()).toHaveLength(0)
    history.observe({ song: song('a'), playing: true, currentMs: 10000 }, 2)
    history.observe({ song: song('a'), playing: true, currentMs: 20000 }, 3)
    expect(history.entries().map((entry) => entry.playedAt)).toEqual([2])
    expect(store.saved).toHaveLength(1)
  })

  it('does not count paused time or a song that changed before ten seconds', () => {
    const history = new PlayHistory(memory())
    history.observe({ song: song('a'), playing: false, currentMs: 30000 }, 1)
    history.observe({ song: song('b'), playing: true, currentMs: 4000 }, 2)
    history.observe({ song: null, playing: false, currentMs: 0 }, 3)
    expect(history.entries()).toHaveLength(0)
  })

  it('counts a song again when it comes back later', () => {
    const history = new PlayHistory(memory())
    history.observe({ song: song('a'), playing: true, currentMs: 12000 }, 1)
    history.observe({ song: song('b'), playing: true, currentMs: 12000 }, 2)
    history.observe({ song: song('a'), playing: true, currentMs: 12000 }, 3)
    expect(history.entries().map((entry) => [entry.song.id, entry.playedAt])).toEqual([['a', 3], ['b', 2]])
  })

  it('restores saved entries and ignores broken ones', () => {
    const history = new PlayHistory(memory([{ song: song('a'), playedAt: 5 }, { nope: true }, 'x']))
    expect(history.entries().map((entry) => entry.song.id)).toEqual(['a'])
  })

  it('notifies listeners and clears', () => {
    const history = new PlayHistory(memory())
    let calls = 0
    history.subscribe(() => calls++)
    history.record(song('a'), 1)
    history.clear()
    expect(calls).toBe(2)
    expect(history.entries()).toHaveLength(0)
  })
})
