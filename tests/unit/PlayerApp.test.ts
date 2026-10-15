import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/ui/components/toast.ts', () => ({ showToast: vi.fn() }))

import { PlayerApp } from '../../src/app/PlayerApp.ts'
import { Playlist } from '../../src/core/Playlist.ts'
import { PlaylistLibrary } from '../../src/core/PlaylistLibrary.ts'
import { PlaybackController } from '../../src/player/PlaybackController.ts'
import { PlayerEmitter, type PlayerAdapter, type PlayerListener } from '../../src/player/PlayerAdapter.ts'
import { showToast } from '../../src/ui/components/toast.ts'
import { song } from './helpers.ts'

class Silent implements PlayerAdapter {
  readonly kind = 'fake'
  private readonly emitter = new PlayerEmitter()
  subscribe(listener: PlayerListener) {
    return this.emitter.subscribe(listener)
  }
  async load() {
    this.emitter.emit({ type: 'state', state: 'paused' })
  }
  play() {}
  pause() {}
  stop() {}
  seek() {}
  setVolume() {}
  destroy() {}
}

function setup(...ids: string[]) {
  const playlist = new Playlist()
  for (const id of ids) playlist.addLast(song(id))
  const playback = new PlaybackController(playlist, { full: new Silent(), preview: new Silent(), resolve: async (s) => [`v-${s.id}`] })
  const app = new PlayerApp(playlist, playback, new PlaylistLibrary(playlist, null))
  const order = () => playlist.list.toArray().map((entry) => entry.id)
  return { playlist, app, order }
}

describe('PlayerApp commands', () => {
  beforeEach(() => vi.mocked(showToast).mockClear())

  it('records a removal once even when it is clicked twice quickly', async () => {
    const { app, playlist, order } = setup('a', 'b', 'c')
    const id = playlist.list.nodes()[1]!.id
    await Promise.all([app.remove(id), app.remove(id)])
    expect(order()).toEqual(['a', 'c'])
    await app.undo()
    expect(order()).toEqual(['a', 'b', 'c'])
    expect(app.history.canUndo).toBe(false)
  })

  it('brings the removed current song back as the current song', async () => {
    const { app, playlist, order } = setup('a', 'b', 'c')
    playlist.next()
    playlist.next()
    const node = playlist.current!
    await app.remove(node.id)
    expect(playlist.current?.value.id).toBe('c')
    await app.undo()
    expect(order()).toEqual(['a', 'b', 'c'])
    expect(playlist.current).toBe(node)
  })

  it('moves the song that was chosen even after the list changed in between', async () => {
    const { app, playlist, order } = setup('a', 'b', 'c', 'd')
    const first = playlist.list.head!.id
    await Promise.all([app.remove(first), app.move(1, 3)])
    expect(order()).toEqual(['c', 'd', 'b'])
    await app.undo()
    expect(order()).toEqual(['b', 'c', 'd'])
  })

  it('confirms the position where a song really landed', async () => {
    const { app, playlist } = setup('a', 'b')
    app.insertAt(3, song('z'))
    await app.history.run({ label: 'noop', execute: () => undefined, revert: () => undefined })
    expect(playlist.list.toArray().map((entry) => entry.id)).toEqual(['a', 'b', 'z'])
    const toast = vi.mocked(showToast).mock.calls.find((call) => String(call[0].title).includes('z'))
    expect(toast?.[0].detail).toContain('Position 3')
  })

  it('reports the real position of a song added last after a concurrent removal', async () => {
    const { app, playlist } = setup('a', 'b', 'c')
    await Promise.all([app.remove(playlist.list.head!.id), app.addLast(song('z'))])
    const toast = vi.mocked(showToast).mock.calls.find((call) => String(call[0].title).includes('z'))
    expect(toast?.[0].detail).toContain('Position 3')
  })
})
