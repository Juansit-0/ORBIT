import { ListNode } from '../core/ListNode.ts'
import type { Playlist, RemoveResult } from '../core/Playlist.ts'
import type { SongNode } from '../core/SongNode.ts'
import type { Song } from '../core/types.ts'
import { ServiceError } from '../services/http.ts'
import type { PlayerAdapter, PlayerEvent, PlayerState } from './PlayerAdapter.ts'

export type SourceKind = 'full' | 'preview'

export interface PlaybackState {
  status: PlayerState
  nodeId: string | null
  currentMs: number
  durationMs: number
  source: SourceKind | null
  volume: number
  song: Song | null
  inPlan: boolean
}

export type PlaybackNotice =
  | { type: 'unavailable'; song: Song }
  | { type: 'preview'; song: Song; reason: 'quota' | 'missing_key' | 'network' | 'not_found' | 'blocked' }
  | { type: 'all_unavailable' }

export interface PlaybackDeps {
  full: PlayerAdapter
  preview: PlayerAdapter
  resolve: (song: Song, signal: AbortSignal) => Promise<string[]>
}

type StateListener = (state: PlaybackState) => void
type NoticeListener = (notice: PlaybackNotice) => void

export class PlaybackController {
  private readonly playlist: Playlist
  private readonly deps: PlaybackDeps
  private readonly stateListeners = new Set<StateListener>()
  private readonly noticeListeners = new Set<NoticeListener>()
  private active: PlayerAdapter | null = null
  private loadedNodeId: string | null = null
  private loadToken = 0
  private abort: AbortController | null = null
  private failures = 0
  private stopAfter = false
  private readonly attempts = new Map<string, { ids: string[]; index: number }>()
  private readonly endListeners = new Set<() => void>()
  private snapshot: PlaybackState = {
    status: 'idle',
    nodeId: null,
    currentMs: 0,
    durationMs: 0,
    source: null,
    volume: 80,
    song: null,
    inPlan: false,
  }
  private transient: SongNode | null = null

  constructor(playlist: Playlist, deps: PlaybackDeps) {
    this.playlist = playlist
    this.deps = deps
    const adapters = new Set([deps.full, deps.preview])
    for (const adapter of adapters) adapter.subscribe((event) => this.handle(adapter, event))
    this.snapshot.nodeId = playlist.current?.id ?? null
    this.snapshot.durationMs = playlist.current?.value.durationMs ?? 0
    this.snapshot.song = playlist.current?.value ?? null
    this.snapshot.inPlan = Boolean(playlist.current)
    playlist.subscribe(() => this.update({}))
  }

  get state(): PlaybackState {
    return this.snapshot
  }

  get isPlaying(): boolean {
    return this.snapshot.status === 'playing' || this.snapshot.status === 'loading'
  }

  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener)
    listener(this.snapshot)
    return () => this.stateListeners.delete(listener)
  }

  onNotice(listener: NoticeListener): () => void {
    this.noticeListeners.add(listener)
    return () => this.noticeListeners.delete(listener)
  }

  get transientNode(): SongNode | null {
    return this.transient && this.snapshot.nodeId === this.transient.id ? this.transient : null
  }

  async playSong(song: Song): Promise<void> {
    this.transient = new ListNode({ ...song, unavailable: false })
    this.failures = 0
    await this.load(this.transient, true)
  }

  takeTransient(): SongNode | null {
    const node = this.transientNode
    this.transient = null
    return node
  }

  async playNode(nodeId: string): Promise<void> {
    this.transient = null
    const node = this.playlist.select(nodeId)
    if (!node) return
    if (node.value.unavailable) {
      this.attempts.delete(node.id)
      this.playlist.updateSong(node.id, { unavailable: false })
    }
    this.failures = 0
    await this.load(node, true)
  }

  async togglePlay(): Promise<void> {
    if (this.isPlaying) {
      this.active?.pause()
      return
    }
    const loose = this.transientNode
    if (loose) {
      if (this.loadedNodeId === loose.id && this.active) this.active.play()
      else await this.load(loose, true)
      return
    }
    const node = this.playlist.current ?? this.playlist.next()
    if (!node) return
    if (this.loadedNodeId === node.id && this.active) this.active.play()
    else await this.load(node, true)
  }

  async next(): Promise<boolean> {
    if (this.transientNode) return this.resumePlan()
    const node = this.playlist.next()
    if (!node) return false
    await this.load(node, true)
    return true
  }

  async previous(): Promise<boolean> {
    if (this.transientNode) return this.resumePlan()
    const node = this.playlist.previous()
    if (!node) return false
    await this.load(node, true)
    return true
  }

  async remove(nodeId: string): Promise<RemoveResult | null> {
    const wasPlaying = this.isPlaying
    const playingThis = this.snapshot.nodeId === nodeId
    const result = this.playlist.remove(nodeId)
    if (!result?.wasCurrent || !playingThis) {
      this.update({})
      return result
    }
    if (result.current) {
      if (wasPlaying) await this.load(result.current, true)
      else this.cue(result.current)
    } else {
      this.stopAll()
    }
    return result
  }

  setStopAfterCurrent(enabled: boolean): void {
    this.stopAfter = enabled
  }

  onTrackEnd(listener: () => void): () => void {
    this.endListeners.add(listener)
    return () => this.endListeners.delete(listener)
  }

  pause(): void {
    if (this.isPlaying) this.active?.pause()
  }

  seek(ms: number): void {
    if (!this.active || this.loadedNodeId === null) return
    const target = Math.min(Math.max(0, ms), this.snapshot.durationMs || ms)
    this.active.seek(target)
    this.update({ currentMs: target })
  }

  seekBy(deltaMs: number): void {
    this.seek(this.snapshot.currentMs + deltaMs)
  }

  setVolume(volume: number): void {
    const clamped = Math.round(Math.min(100, Math.max(0, volume)))
    this.deps.full.setVolume(clamped)
    this.deps.preview.setVolume(clamped)
    this.update({ volume: clamped })
  }

  syncWithPlaylist(): void {
    if (this.transientNode) {
      this.update({})
      return
    }
    const current = this.playlist.current
    if (!current) {
      if (this.snapshot.nodeId !== null) this.stopAll()
      return
    }
    if (current.id !== this.snapshot.nodeId && current.id !== this.loadedNodeId) this.cue(current)
  }

  private async resumePlan(): Promise<boolean> {
    this.transient = null
    const node = this.playlist.current ?? this.playlist.next()
    if (!node) {
      this.stopAll()
      return false
    }
    await this.load(node, true)
    return true
  }

  private patchSong(node: SongNode, patch: Partial<Song>): void {
    if (node === this.transient) node.value = { ...node.value, ...patch }
    else this.playlist.updateSong(node.id, patch)
  }

  private cue(node: SongNode): void {
    this.cancelPending()
    this.active?.pause()
    this.loadedNodeId = null
    this.update({ status: 'paused', nodeId: node.id, currentMs: 0, durationMs: node.value.durationMs, source: null })
  }

  private stopAll(): void {
    this.cancelPending()
    this.active?.stop()
    this.active = null
    this.loadedNodeId = null
    this.update({ status: 'idle', nodeId: null, currentMs: 0, durationMs: 0, source: null })
  }

  private cancelPending(): void {
    this.loadToken += 1
    this.abort?.abort()
    this.abort = null
  }

  private async load(node: SongNode, autoplay: boolean): Promise<void> {
    this.cancelPending()
    const token = this.loadToken
    const abort = new AbortController()
    this.abort = abort
    const song = node.value
    this.loadedNodeId = null
    this.update({ status: 'loading', nodeId: node.id, currentMs: 0, durationMs: song.durationMs, source: null })
    if (song.unavailable) return this.skipUnavailable(node)
    let ids: string[] = []
    let fallbackReason: 'quota' | 'missing_key' | 'network' | 'not_found' | null = null
    try {
      ids = await this.deps.resolve(song, abort.signal)
    } catch (error) {
      if (token !== this.loadToken) return
      const kind = error instanceof ServiceError ? error.kind : 'network'
      if (kind === 'aborted') return
      fallbackReason = kind === 'quota' || kind === 'missing_key' || kind === 'not_found' ? kind : 'network'
    }
    if (token !== this.loadToken) return
    if (song.videoId) ids = [song.videoId, ...ids.filter((id) => id !== song.videoId)]
    const videoId = ids[0]
    if (videoId) {
      this.attempts.set(node.id, { ids, index: 0 })
      if (song.videoId !== videoId) this.patchSong(node, { videoId })
      await this.start(this.deps.full, { videoId, durationMs: song.durationMs }, node, 'full', autoplay, token)
      return
    }
    await this.fallbackToPreview(node, fallbackReason ?? 'network', autoplay, token)
  }

  private async fallbackToPreview(
    node: SongNode,
    reason: 'quota' | 'missing_key' | 'network' | 'not_found' | 'blocked',
    autoplay: boolean,
    token: number,
  ): Promise<void> {
    const song = node.value
    if (song.previewUrl) {
      this.notify({ type: 'preview', song, reason })
      await this.start(
        this.deps.preview,
        { previewUrl: song.previewUrl, durationMs: 30000 },
        node,
        'preview',
        autoplay,
        token,
      )
      return
    }
    this.markUnavailable(node)
  }

  private async start(
    adapter: PlayerAdapter,
    source: { videoId?: string; previewUrl?: string; durationMs: number },
    node: SongNode,
    kind: SourceKind,
    autoplay: boolean,
    token: number,
  ): Promise<void> {
    if (this.active && this.active !== adapter) this.active.stop()
    this.active = adapter
    this.loadedNodeId = node.id
    this.update({ source: kind, durationMs: source.durationMs })
    try {
      await adapter.load(source, autoplay)
      if (token === this.loadToken) this.failures = 0
    } catch {
      if (token === this.loadToken) this.markUnavailable(node)
    }
  }

  private markUnavailable(node: SongNode): void {
    this.patchSong(node, { unavailable: true })
    this.notify({ type: 'unavailable', song: node.value })
    if (node === this.transient) {
      this.active?.stop()
      this.loadedNodeId = null
      this.update({ status: 'idle', currentMs: 0, source: null })
      return
    }
    void this.skipUnavailable(node)
  }

  private async skipUnavailable(node: SongNode): Promise<void> {
    this.failures += 1
    const playable = this.playlist.list.findNode((song) => !song.unavailable)
    if (!playable || this.failures > this.playlist.size) {
      this.failures = 0
      this.notify({ type: 'all_unavailable' })
      this.active?.stop()
      this.loadedNodeId = null
      this.update({ status: 'idle', nodeId: node.id, currentMs: 0, source: null })
      return
    }
    const next = this.playlist.next()
    if (next && next !== node) await this.load(next, true)
    else {
      this.failures = 0
      this.loadedNodeId = null
      this.update({ status: 'idle', currentMs: 0, source: null })
    }
  }

  private handle(adapter: PlayerAdapter, event: PlayerEvent): void {
    if (adapter !== this.active) return
    if (event.type === 'state') {
      if (event.state === 'ended' || event.state === 'idle') return
      this.update({ status: event.state })
    } else if (event.type === 'progress') {
      this.update({ currentMs: event.currentMs, durationMs: event.durationMs || this.snapshot.durationMs })
    } else if (event.type === 'ended') {
      void this.handleEnded()
    } else if (event.type === 'error') {
      const node = this.playlist.current
      if (node && node.id === this.loadedNodeId) void this.recover(node)
    }
  }

  private async recover(node: SongNode): Promise<void> {
    const token = this.loadToken
    if (this.snapshot.source === 'preview') {
      this.markUnavailable(node)
      return
    }
    const attempt = this.attempts.get(node.id)
    const nextId = attempt ? attempt.ids[attempt.index + 1] : undefined
    if (attempt && nextId) {
      attempt.index += 1
      this.patchSong(node, { videoId: nextId })
      this.update({ status: 'loading' })
      await this.start(this.deps.full, { videoId: nextId, durationMs: node.value.durationMs }, node, 'full', true, token)
      return
    }
    this.attempts.delete(node.id)
    await this.fallbackToPreview(node, 'blocked', true, token)
  }

  private async handleEnded(): Promise<void> {
    const stop = this.stopAfter
    this.stopAfter = false
    for (const listener of this.endListeners) listener()
    if (stop) {
      this.active?.seek(0)
      this.update({ status: 'paused', currentMs: 0 })
      return
    }
    const loose = this.transientNode
    if (loose) {
      if (this.playlist.repeat === 'one' && this.active) {
        this.active.seek(0)
        this.active.play()
        return
      }
      this.active?.seek(0)
      this.update({ status: 'paused', currentMs: 0 })
      return
    }
    const current = this.playlist.current
    const node = this.playlist.advanceAfterEnd()
    if (!node) {
      this.loadedNodeId = null
      this.update({ status: 'idle', nodeId: current?.id ?? null, currentMs: 0 })
      return
    }
    if (node === current && this.active && this.loadedNodeId === node.id) {
      this.active.seek(0)
      this.active.play()
      return
    }
    await this.load(node, true)
  }

  private update(patch: Partial<PlaybackState>): void {
    const next = { ...this.snapshot, ...patch }
    if (next.nodeId && this.transient && next.nodeId === this.transient.id) {
      next.song = this.transient.value
      next.inPlan = false
    } else {
      const node = next.nodeId ? this.playlist.list.findById(next.nodeId) : null
      next.song = node?.value ?? null
      next.inPlan = Boolean(node)
    }
    this.snapshot = next
    for (const listener of this.stateListeners) listener(this.snapshot)
  }

  private notify(notice: PlaybackNotice): void {
    for (const listener of this.noticeListeners) listener(notice)
  }
}
