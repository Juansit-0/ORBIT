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
import { VolumeFader } from '../../src/player/VolumeFader.ts'
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

  volume = 80

  setVolume(volume: number): void {
    this.volume = volume
  }

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
  let resolve: ReturnType<typeof vi.fn<(song: Song, signal: AbortSignal) => Promise<string[]>>>
  let controller: PlaybackController
  let notices: PlaybackNotice[]

  beforeEach(() => {
    playlist = new Playlist()
    for (const id of ['a', 'b', 'c']) playlist.addLast({ ...song(id), previewUrl: `https://p/${id}` })
    full = new StubPlayer()
    preview = new StubPlayer()
    resolve = vi.fn(async (s: Song) => [`v-${s.id}`, `v-${s.id}-alt`])
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

  it('tries the next video candidate when YouTube refuses to embed one', async () => {
    await controller.togglePlay()
    full.emitter.emit({ type: 'error', reason: 'unplayable' })
    await flush()
    expect(full.loaded?.videoId).toBe('v-a-alt')
    expect(playlist.current?.value.id).toBe('a')
    expect(playlist.current?.value.videoId).toBe('v-a-alt')
  })

  it('falls back to the preview when every candidate is blocked', async () => {
    await controller.togglePlay()
    full.emitter.emit({ type: 'error', reason: 'unplayable' })
    await flush()
    full.emitter.emit({ type: 'error', reason: 'unplayable' })
    await flush()
    expect(preview.loaded?.previewUrl).toBe('https://p/a')
    expect(controller.state.source).toBe('preview')
    expect(notices.at(-1)).toMatchObject({ type: 'preview', reason: 'blocked' })
    expect(playlist.current?.value.unavailable).toBeUndefined()
  })

  it('skips the song when blocked everywhere and no preview exists', async () => {
    playlist.list.head!.value = song('a')
    resolve.mockResolvedValueOnce(['only'])
    await controller.togglePlay()
    full.emitter.emit({ type: 'error', reason: 'unplayable' })
    await flush()
    expect(playlist.list.head?.value.unavailable).toBe(true)
    expect(full.loaded?.videoId).toBe('v-b')
  })

  it('marks a song unavailable when even its preview fails', async () => {
    resolve.mockRejectedValueOnce(new ServiceError('quota', 'quota'))
    await controller.togglePlay()
    preview.emitter.emit({ type: 'error', reason: 'network' })
    await flush()
    expect(playlist.list.head?.value.unavailable).toBe(true)
  })

  it('gives an unavailable song another try when it is played on purpose', async () => {
    playlist.updateSong(playlist.list.head!.id, { unavailable: true })
    await controller.playNode(playlist.list.head!.id)
    expect(full.loaded?.videoId).toBe('v-a')
    expect(playlist.list.head?.value.unavailable).toBe(false)
  })

  it('tries the remembered working video first', async () => {
    playlist.updateSong(playlist.list.head!.id, { videoId: 'v-a-alt' })
    await controller.togglePlay()
    expect(full.loaded?.videoId).toBe('v-a-alt')
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
    let release: (value: string[]) => void = () => {}
    resolve.mockImplementationOnce(() => new Promise((r) => (release = r)))
    const first = controller.togglePlay()
    await controller.next()
    release(['stale'])
    await first
    expect(full.loaded?.videoId).toBe('v-b')
  })

  it('reports the end of the plan and of loose songs', async () => {
    const planEnded = vi.fn()
    const looseEnded = vi.fn()
    controller.onPlanEnd(planEnded)
    controller.onLooseEnd(looseEnded)
    await controller.playNode(playlist.list.tail!.id)
    full.end()
    await flush()
    expect(planEnded).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }))
    await controller.playSong(song('x'))
    full.end()
    await flush()
    expect(looseEnded).toHaveBeenCalledWith(expect.objectContaining({ id: 'x' }))
  })

  it('stops after the current song when asked', async () => {
    const ended = vi.fn()
    controller.onTrackEnd(ended)
    await controller.togglePlay()
    controller.setStopAfterCurrent(true)
    full.end()
    await flush()
    expect(ended).toHaveBeenCalledTimes(1)
    expect(controller.state.status).toBe('paused')
    expect(playlist.current?.value.id).toBe('a')
    full.end()
    await flush()
    expect(playlist.current?.value.id).toBe('b')
  })

  it('pause only acts while playing', async () => {
    controller.pause()
    expect(full.playing).toBe(false)
    await controller.togglePlay()
    controller.pause()
    expect(controller.state.status).toBe('paused')
  })

  describe('songs outside the flight plan', () => {
    it('plays a song without touching the list', async () => {
      await controller.playSong({ ...song('x'), previewUrl: 'https://p/x' })
      expect(full.loaded?.videoId).toBe('v-x')
      expect(controller.state).toMatchObject({ status: 'playing', inPlan: false })
      expect(controller.state.song?.id).toBe('x')
      expect(playlist.size).toBe(3)
      expect(playlist.current).toBeNull()
      expect(resolve.mock.calls[0]?.[0].id).toBe('x')
    })

    it('stops when it ends and replays with repeat one', async () => {
      await controller.playSong(song('x'))
      full.end()
      await flush()
      expect(controller.state).toMatchObject({ status: 'paused', inPlan: false })
      expect(playlist.current).toBeNull()
      playlist.setRepeat('one')
      await controller.togglePlay()
      full.end()
      await flush()
      expect(full.seeks).toContain(0)
      expect(controller.state.status).toBe('playing')
    })

    it('next and previous resume the flight plan where it was', async () => {
      await controller.playNode(playlist.list.getNode(1)!.id)
      await controller.playSong(song('x'))
      expect(await controller.next()).toBe(true)
      expect(full.loaded?.videoId).toBe('v-b')
      expect(controller.state.inPlan).toBe(true)
      await controller.playSong(song('y'))
      expect(await controller.previous()).toBe(true)
      expect(full.loaded?.videoId).toBe('v-b')
    })

    it('starts the flight plan from the head when nothing was playing before', async () => {
      await controller.playSong(song('x'))
      await controller.next()
      expect(playlist.current?.value.id).toBe('a')
    })

    it('keeps playing when songs are removed from the list', async () => {
      await controller.playNode(playlist.list.head!.id)
      await controller.playSong(song('x'))
      await controller.remove(playlist.list.head!.id)
      expect(full.loaded?.videoId).toBe('v-x')
      expect(controller.state.song?.id).toBe('x')
    })

    it('does not jump into the list when it cannot be played', async () => {
      resolve.mockRejectedValueOnce(new ServiceError('not_found', 'x'))
      await controller.playSong(song('x'))
      await flush()
      expect(notices.at(-1)).toMatchObject({ type: 'unavailable' })
      expect(controller.state.status).toBe('idle')
      expect(playlist.current).toBeNull()
    })

    it('hands the node over when it is added to the plan', async () => {
      await controller.playSong(song('x'))
      const node = controller.takeTransient()!
      playlist.insertNodeAt(playlist.size, node)
      playlist.select(node.id)
      expect(controller.state.inPlan).toBe(true)
      expect(playlist.list.tail?.value.id).toBe('x')
    })
  })

  describe('with smooth volume transitions', () => {
    function instantFader(): VolumeFader {
      return new VolumeFader({ now: () => 0, schedule: () => 0, cancel: () => undefined }) as VolumeFader
    }

    it('fades out before pausing and restores the volume', async () => {
      const volumes: number[] = []
      full.setVolume = (v: number) => void volumes.push(v)
      const fader = new VolumeFader({ now: (() => { let t = 0; return () => (t += 400) })(), schedule: (cb) => (cb(), 1), cancel: () => undefined })
      controller.setFader(fader)
      await controller.togglePlay()
      volumes.length = 0
      await controller.togglePlay()
      expect(full.playing).toBe(false)
      expect(volumes).toContain(0)
      expect(volumes.at(-1)).toBe(80)
    })

    it('starts new songs from silence and fades in', async () => {
      const volumes: number[] = []
      full.setVolume = (v: number) => void volumes.push(v)
      controller.setFader(new VolumeFader({ now: (() => { let t = 0; return () => (t += 500) })(), schedule: (cb) => (cb(), 1), cancel: () => undefined }))
      await controller.togglePlay()
      expect(volumes[0]).toBe(0)
      expect(volumes.at(-1)).toBe(80)
    })

    it('restores the volume when transitions are turned off', async () => {
      const volumes: number[] = []
      full.setVolume = (v: number) => void volumes.push(v)
      controller.setFader(instantFader())
      controller.setFader(null)
      expect(volumes.at(-1)).toBe(80)
    })
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
