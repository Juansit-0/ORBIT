import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Playlist } from '../../src/core/Playlist.ts'
import { expectIntegrity, sequenceRandom, song } from './helpers.ts'

function playlistOf(...ids: string[]): Playlist {
  const playlist = new Playlist(sequenceRandom([0.42, 0.13, 0.87, 0.5, 0.21]))
  for (const id of ids) playlist.addLast(song(id))
  return playlist
}

function titles(playlist: Playlist): string[] {
  return playlist.list.toArray().map((s) => s.id)
}

describe('Playlist', () => {
  let playlist: Playlist

  beforeEach(() => {
    playlist = playlistOf()
  })

  describe('adding songs', () => {
    it('adds at the start, the end and any position', () => {
      playlist.addLast(song('b'))
      playlist.addFirst(song('a'))
      playlist.addLast(song('d'))
      playlist.insertAt(2, song('c'))
      expect(titles(playlist)).toEqual(['a', 'b', 'c', 'd'])
      expectIntegrity(playlist.list)
    })

    it('allows duplicates as separate nodes', () => {
      const first = playlist.addLast(song('a'))
      const second = playlist.addLast(song('a'))
      expect(first.id).not.toBe(second.id)
      expect(playlist.containsSong('a')).toBe(true)
      expect(playlist.size).toBe(2)
    })

    it('does not change the current song when inserting before it', () => {
      playlist = playlistOf('a', 'b')
      playlist.select(playlist.list.getNode(1)!.id)
      playlist.addFirst(song('z'))
      playlist.insertAt(1, song('y'))
      expect(playlist.current?.value.id).toBe('b')
      expect(playlist.indexOfCurrent()).toBe(3)
    })

    it('rejects invalid positions without changes', () => {
      playlist = playlistOf('a')
      expect(() => playlist.insertAt(5, song('x'))).toThrow(RangeError)
      expect(titles(playlist)).toEqual(['a'])
    })
  })

  describe('navigation without repeat', () => {
    beforeEach(() => {
      playlist = playlistOf('a', 'b', 'c')
    })

    it('starts at the head on next and at the tail on previous', () => {
      expect(playlist.next()?.value.id).toBe('a')
      playlist.current = null
      expect(playlist.previous()?.value.id).toBe('c')
    })

    it('moves forward and backward through prev and next pointers', () => {
      playlist.next()
      expect(playlist.next()?.value.id).toBe('b')
      expect(playlist.next()?.value.id).toBe('c')
      expect(playlist.previous()?.value.id).toBe('b')
      expect(playlist.previous()?.value.id).toBe('a')
    })

    it('stops at both ends', () => {
      playlist.select(playlist.list.tail!.id)
      expect(playlist.hasNext()).toBe(false)
      expect(playlist.next()).toBeNull()
      expect(playlist.current?.value.id).toBe('c')
      playlist.select(playlist.list.head!.id)
      expect(playlist.hasPrevious()).toBe(false)
      expect(playlist.previous()).toBeNull()
      expect(playlist.current?.value.id).toBe('a')
    })

    it('stops after the last song ends', () => {
      playlist.select(playlist.list.tail!.id)
      expect(playlist.advanceAfterEnd()).toBeNull()
    })
  })

  describe('empty and single song lists', () => {
    it('cannot navigate an empty list', () => {
      expect(playlist.hasNext()).toBe(false)
      expect(playlist.hasPrevious()).toBe(false)
      expect(playlist.next()).toBeNull()
      expect(playlist.previous()).toBeNull()
      expect(playlist.advanceAfterEnd()).toBeNull()
    })

    it('stays on a single song unless repeating', () => {
      playlist = playlistOf('a')
      playlist.next()
      expect(playlist.next()).toBeNull()
      playlist.setRepeat('all')
      expect(playlist.next()?.value.id).toBe('a')
      expect(playlist.previous()?.value.id).toBe('a')
    })
  })

  describe('repeat modes', () => {
    beforeEach(() => {
      playlist = playlistOf('a', 'b', 'c')
    })

    it('cycles off, all, one', () => {
      expect(playlist.cycleRepeat()).toBe('all')
      expect(playlist.cycleRepeat()).toBe('one')
      expect(playlist.cycleRepeat()).toBe('off')
    })

    it('wraps around with repeat all', () => {
      playlist.setRepeat('all')
      playlist.select(playlist.list.tail!.id)
      expect(playlist.next()?.value.id).toBe('a')
      expect(playlist.previous()?.value.id).toBe('c')
      expect(playlist.advanceAfterEnd()?.value.id).toBe('a')
    })

    it('repeats the same song when it ends with repeat one', () => {
      playlist.setRepeat('one')
      playlist.select(playlist.list.getNode(1)!.id)
      expect(playlist.advanceAfterEnd()?.value.id).toBe('b')
      expect(playlist.next()?.value.id).toBe('c')
    })
  })

  describe('removing songs', () => {
    beforeEach(() => {
      playlist = playlistOf('a', 'b', 'c')
    })

    it('removes a song that is not playing', () => {
      playlist.select(playlist.list.head!.id)
      const result = playlist.remove(playlist.list.getNode(2)!.id)
      expect(result).toMatchObject({ wasCurrent: false })
      expect(playlist.current?.value.id).toBe('a')
      expect(titles(playlist)).toEqual(['a', 'b'])
      expectIntegrity(playlist.list)
    })

    it('moves to the next song when removing the current one', () => {
      playlist.select(playlist.list.getNode(1)!.id)
      const result = playlist.remove(playlist.current!.id)
      expect(result?.wasCurrent).toBe(true)
      expect(result?.current?.value.id).toBe('c')
    })

    it('moves to the previous song when removing the current tail', () => {
      playlist.select(playlist.list.tail!.id)
      expect(playlist.remove(playlist.current!.id)?.current?.value.id).toBe('b')
    })

    it('clears the current song when removing the last remaining one', () => {
      playlist = playlistOf('a')
      playlist.next()
      const result = playlist.remove(playlist.current!.id)
      expect(result?.current).toBeNull()
      expect(playlist.isEmpty()).toBe(true)
      expectIntegrity(playlist.list)
    })

    it('returns null for an unknown id', () => {
      expect(playlist.remove('missing')).toBeNull()
      expect(playlist.size).toBe(3)
    })
  })

  describe('moving songs', () => {
    it('keeps the current song while reordering', () => {
      playlist = playlistOf('a', 'b', 'c', 'd')
      playlist.select(playlist.list.getNode(1)!.id)
      playlist.move(1, 3)
      expect(titles(playlist)).toEqual(['a', 'c', 'd', 'b'])
      expect(playlist.current?.value.id).toBe('b')
      expect(playlist.hasNext()).toBe(false)
      expectIntegrity(playlist.list)
    })
  })

  describe('shuffle', () => {
    beforeEach(() => {
      playlist = playlistOf('a', 'b', 'c', 'd', 'e')
      playlist.next()
    })

    it('visits every song once without changing the real order', () => {
      playlist.setShuffle(true)
      const visited = [playlist.current!.value.id]
      while (playlist.next()) visited.push(playlist.current!.value.id)
      expect(visited[0]).toBe('a')
      expect([...visited].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
      expect(titles(playlist)).toEqual(['a', 'b', 'c', 'd', 'e'])
    })

    it('goes back through the shuffled order', () => {
      playlist.setShuffle(true)
      const order = playlist.playOrder().map((n) => n.value.id)
      playlist.next()
      playlist.next()
      expect(playlist.previous()?.value.id).toBe(order[1])
    })

    it('includes songs added while shuffling', () => {
      playlist.setShuffle(true)
      playlist.addLast(song('f'))
      const order = playlist.playOrder().map((n) => n.value.id)
      expect(order).toHaveLength(6)
      expect(order[0]).toBe('a')
      expect(order).toContain('f')
    })

    it('drops removed songs from the shuffled order', () => {
      playlist.setShuffle(true)
      const victim = playlist.list.getNode(3)!
      playlist.remove(victim.id)
      expect(playlist.playOrder()).not.toContain(victim)
      expect(playlist.playOrder()).toHaveLength(4)
    })

    it('returns to list order when disabled', () => {
      playlist.toggleShuffle()
      expect(playlist.toggleShuffle()).toBe(false)
      expect(playlist.next()?.value.id).toBe('b')
    })
  })

  describe('persistence', () => {
    it('restores songs, current song and modes', () => {
      playlist = playlistOf('a', 'b', 'c')
      playlist.select(playlist.list.getNode(1)!.id)
      playlist.setRepeat('all')
      playlist.setShuffle(true)
      const restored = new Playlist()
      restored.restore(JSON.parse(JSON.stringify(playlist.snapshot())))
      expect(titles(restored)).toEqual(['a', 'b', 'c'])
      expect(restored.current?.value.id).toBe('b')
      expect(restored.repeat).toBe('all')
      expect(restored.shuffle).toBe(true)
      expectIntegrity(restored.list)
    })

    it('restores an empty snapshot', () => {
      playlist.restore({ songs: [], currentIndex: -1, repeat: 'off', shuffle: false })
      expect(playlist.isEmpty()).toBe(true)
      expect(playlist.current).toBeNull()
    })
  })

  it('updates song data in place', () => {
    playlist = playlistOf('a')
    const node = playlist.list.head!
    playlist.updateSong(node.id, { videoId: 'xyz' })
    expect(node.value.videoId).toBe('xyz')
  })

  it('notifies listeners and stops after unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = playlist.subscribe(listener)
    playlist.addLast(song('a'))
    playlist.next()
    expect(listener.mock.calls.map((call) => call[0])).toEqual(['add', 'select'])
    unsubscribe()
    playlist.clear()
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
