import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Playlist } from '../../src/core/Playlist.ts'
import { PlaylistLibrary } from '../../src/core/PlaylistLibrary.ts'
import { song } from './helpers.ts'

function ids(playlist: Playlist): string[] {
  return playlist.list.toArray().map((s) => s.id)
}

describe('PlaylistLibrary', () => {
  let playlist: Playlist
  let library: PlaylistLibrary

  beforeEach(() => {
    playlist = new Playlist()
    playlist.addLast(song('a'))
    playlist.addLast(song('b'))
    library = new PlaylistLibrary(playlist, null)
  })

  it('wraps the existing playlist as the first entry', () => {
    expect(library.size).toBe(1)
    expect(library.active.name).toBe('My flight plan')
    expect(library.active.snapshot.songs.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('creates an empty playlist and switches to it', () => {
    const result = library.create('  Road   trip ')
    expect(result.ok && result.entry.name).toBe('Road trip')
    expect(playlist.isEmpty()).toBe(true)
    expect(library.active.name).toBe('Road trip')
  })

  it('keeps each playlist separate when switching back and forth', () => {
    const first = library.activeId
    library.create('Focus')
    playlist.addLast(song('x'))
    library.switchTo(first)
    expect(ids(playlist)).toEqual(['a', 'b'])
    playlist.remove(playlist.list.head!.id)
    const focus = library.list().find((entry) => entry.name === 'Focus')!
    library.switchTo(focus.id)
    expect(ids(playlist)).toEqual(['x'])
    library.switchTo(first)
    expect(ids(playlist)).toEqual(['b'])
  })

  it('rejects empty, too long and duplicate names', () => {
    expect(library.create('   ')).toEqual({ ok: false, error: 'Give the playlist a name.' })
    expect(library.create('x'.repeat(41)).ok).toBe(false)
    expect(library.create('my FLIGHT plan')).toEqual({ ok: false, error: 'A playlist named “My flight plan” already exists.' })
    expect(library.size).toBe(1)
  })

  it('renames, allowing the same name with different case on itself', () => {
    expect(library.rename(library.activeId, 'MY FLIGHT PLAN').ok).toBe(true)
    expect(library.active.name).toBe('MY FLIGHT PLAN')
    library.create('Other', false)
    expect(library.rename(library.activeId, 'other').ok).toBe(false)
    expect(library.rename('missing', 'x').ok).toBe(false)
  })

  it('never deletes the last playlist and moves to a neighbour when deleting the active one', () => {
    expect(library.remove(library.activeId)).toEqual({ ok: false, error: 'Keep at least one playlist.' })
    const first = library.activeId
    library.create('Second')
    playlist.addLast(song('s'))
    library.switchTo(first)
    expect(library.remove(first).ok).toBe(true)
    expect(library.active.name).toBe('Second')
    expect(ids(playlist)).toEqual(['s'])
  })

  it('restores from saved state including the active playlist', () => {
    library.create('Second')
    playlist.addLast(song('z'))
    const state = JSON.parse(JSON.stringify(library.state()))
    const fresh = new Playlist()
    const restored = new PlaylistLibrary(fresh, state)
    expect(restored.size).toBe(2)
    expect(restored.active.name).toBe('Second')
    expect(ids(fresh)).toEqual(['z'])
  })

  it('falls back to the first entry when the saved active id is unknown', () => {
    const state = library.state()
    const restored = new PlaylistLibrary(new Playlist(), { ...state, activeId: 'nope' })
    expect(restored.active.name).toBe('My flight plan')
  })

  it('notifies listeners', () => {
    const listener = vi.fn()
    library.subscribe(listener)
    library.create('A')
    library.rename(library.activeId, 'B')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
