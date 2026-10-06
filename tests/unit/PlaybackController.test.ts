import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Playlist } from '../../src/core/Playlist.ts'
import type { Song } from '../../src/core/types.ts'
import { PlaybackController, type PlaybackNotice } from '../../src/player/PlaybackController.ts'
import {
  PlayerEmitter,
  type PlayerAdapter,
  type PlayerListener,
  type PlayerSource,
} from '../../src/player/PlayerAdapter.ts'
import { ServiceError } from '../../src/services/http.ts'
import { song } from './helpers.ts'

class StubPlayer implements PlayerAdapter {
  readonly kind = 'fake'
  readonly emitter = new PlayerEmitter()
  loaded: PlayerSource | null = null
  playing = false
  failNextLoad = false
  seeks: number[] = []

  subscribe(listener: PlayerListener): () => void {
    return this.emitter.subscribe(listener)
  }

  async load(source: PlayerSource, autoplay: boolean): Promise<void> {
    if (this.failNextLoad) {
      this.failNextLoad = false
      throw new Error('fail')
    }
    this.loaded = source
    if (autoplay) this.play()
    else this.pause()
  }

  play(): void {
    this.playing = true
    this.emitter.emit({ type: 'state', state: 'playing' })
  }

  pause(): void {
    this.playing = false
    this.emitter.emit({ type: 'state', state: 'paused' })
  }

  stop(): void {
    this.playing = false
    this.loaded = null
  }

  seek(ms: number): void {
    this.seeks.push(ms)
  }

  setVolume(): void {}

  destroy(): void {}

  end(): void {
    this.emitter.emit({ type: 'ended' })
  }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('PlaybackController', () => {
  let playlist: Playlist
  let full: StubPlayer
  let preview: StubPlayer
  let resolve: ReturnType<typeof vi.fn<(song: Song, signal: AbortSignal) => Promise<string>>>
  let controller: PlaybackController
  let notices: PlaybackNotice[]

  beforeEach(() => {
    playlist = new Playlist()
    for (const id of ['a', 'b', 'c']) playlist.addLast({ ...song(id), previewUrl: `https://p/${id}` })
    full = new StubPlayer()
    preview = new StubPlayer()
    resolve = vi.fn(async (s: Song) => `v-${s.id}`)
    controller = new PlaybackController(playlist, { full, preview, resolve })
    notices = []
    controller.onNotice((notice) => notices.push(notice))
  })

  it('starts the first song on play', async () => {
    await controller.togglePlay()
    expect(full.loaded?.videoId).toBe('v-a')
    expect(controller.state).toMatchObject({ status: 'playing', source: 'full' })
    expect(playlist.current?.value.videoId).toBe('v-a')
  })

  it('pauses and resumes without reloading', async () => {
    await controller.togglePlay()
    await controller.togglePlay()
    expect(controller.state.status).toBe('paused')
    await controller.togglePlay()
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(controller.state.status).toBe('playing')
  })

  it('moves forward and backward', async () => {
    await controller.togglePlay()
    expect(await controller.next()).toBe(true)
    expect(full.loaded?.videoId).toBe('v-b')
    expect(await controller.previous()).toBe(true)
    expect(full.loaded?.videoId).toBe('v-a')
    expect(await controller.previous()).toBe(false)
  })

  it('advances when a song ends and stops at the tail', async () => {
    await controller.playNode(playlist.list.getNode(1)!.id)
    full.end()
    await flush()
    expect(full.loaded?.videoId).toBe('v-c')
    full.end()
    await flush()
    expect(controller.state.status).toBe('idle')
    expect(playlist.current?.value.id).toBe('c')
  })

  it('replays the same song with repeat one', async () => {
    playlist.setRepeat('one')
    await controller.togglePlay()
    full.end()
    await flush()
    expect(full.seeks).toContain(0)
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('falls back to the preview when the quota is exhausted', async () => {
    resolve.mockRejectedValueOnce(new ServiceError('quota', 'quota'))
    await controller.togglePlay()
    expect(preview.loaded?.previewUrl).toBe('https://p/a')
    expect(controller.state.source).toBe('preview')
    expect(notices[0]).toMatchObject({ type: 'preview', reason: 'quota' })
  })

  it('marks a song unavailable and skips it when nothing can play', async () => {
    playlist.list.head!.value = song('a')
    resolve.mockRejectedValueOnce(new ServiceError('not_found', 'x'))
    await controller.togglePlay()
    await flush()
    expect(playlist.list.head?.value.unavailable).toBe(true)
    expect(notices[0]).toMatchObject({ type: 'unavailable' })
    expect(full.loaded?.videoId).toBe('v-b')
  })

  it('skips to the next song when the player reports an error', async () => {
    await controller.togglePlay()
    full.emitter.emit({ type: 'error', reason: 'unplayable' })
    await flush()
    expect(full.loaded?.videoId).toBe('v-b')
  })

  it('stops when every song is unavailable', async () => {
    for (const node of playlist.list.nodes()) playlist.updateSong(node.id, { unavailable: true })
    await controller.togglePlay()
    await flush()
    expect(notices.some((n) => n.type === 'all_unavailable')).toBe(true)
    expect(controller.state.status).toBe('idle')
  })

  it('continues with the next song when the playing one is removed', async () => {
    await controller.togglePlay()
    await controller.remove(playlist.current!.id)
    expect(full.loaded?.videoId).toBe('v-b')
    expect(controller.state.status).toBe('playing')
  })

  it('cues the next song without playing when paused', async () => {
    await controller.togglePlay()
    await controller.togglePlay()
    await controller.remove(playlist.current!.id)
    expect(controller.state).toMatchObject({ status: 'paused', nodeId: playlist.current!.id })
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('stops when the last song is removed', async () => {
    const single = new Playlist()
    single.addLast(song('x'))
    const solo = new PlaybackController(single, { full, preview, resolve })
    await solo.togglePlay()
    await solo.remove(single.current!.id)
    expect(solo.state).toMatchObject({ status: 'idle', nodeId: null })
  })

  it('ignores stale resolves when the user skips quickly', async () => {
    let release: (value: string) => void = () => {}
    resolve.mockImplementationOnce(() => new Promise((r) => (release = r)))
    const first = controller.togglePlay()
    await controller.next()
    release('stale')
    await first
    expect(full.loaded?.videoId).toBe('v-b')
  })

  it('clamps seek and volume', async () => {
    await controller.togglePlay()
    controller.seek(-50)
    expect(full.seeks.at(-1)).toBe(0)
    controller.setVolume(150)
    expect(controller.state.volume).toBe(100)
  })

  it('treats a failed player load as unavailable', async () => {
    full.failNextLoad = true
    await controller.togglePlay()
    await flush()
    expect(playlist.list.head?.value.unavailable).toBe(true)
  })
})
