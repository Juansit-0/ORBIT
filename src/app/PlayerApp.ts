import { Playlist, type PlaylistChange } from '../core/Playlist.ts'
import type { Song } from '../core/types.ts'
import type { PlaybackController, PlaybackNotice } from '../player/PlaybackController.ts'
import { savePlaylist } from '../services/storage.ts'
import { showToast } from '../ui/components/toast.ts'
import { quoted } from '../ui/format.ts'

export type InsertResult = { ok: true; position: number } | { ok: false; error: string }

export class PlayerApp {
  readonly playlist: Playlist
  readonly playback: PlaybackController

  constructor(playlist: Playlist, playback: PlaybackController) {
    this.playlist = playlist
    this.playback = playback
    playlist.subscribe((change) => this.persist(change))
    playback.onNotice((notice) => this.announce(notice))
  }

  addFirst(song: Song): void {
    const duplicate = this.playlist.containsSong(song.id)
    this.playlist.addFirst(song)
    this.confirmAdd(song, 1, duplicate)
  }

  addLast(song: Song): void {
    const duplicate = this.playlist.containsSong(song.id)
    this.playlist.addLast(song)
    this.confirmAdd(song, this.playlist.size, duplicate)
  }

  insertAt(position: number, song: Song): InsertResult {
    const max = this.playlist.size + 1
    if (!Number.isInteger(position) || position < 1 || position > max) {
      return { ok: false, error: max === 1 ? 'The list is empty, so the only position is 1.' : `Choose a position from 1 to ${max}.` }
    }
    const duplicate = this.playlist.containsSong(song.id)
    this.playlist.insertAt(position - 1, song)
    this.confirmAdd(song, position, duplicate)
    return { ok: true, position }
  }

  async remove(nodeId: string): Promise<void> {
    const node = this.playlist.list.findById(nodeId)
    if (!node) return
    const position = this.playlist.list.indexOf(node) + 1
    const result = await this.playback.remove(nodeId)
    if (!result) return
    const detail = result.wasCurrent
      ? result.current
        ? `It was playing, so ${quoted(result.current.value.title)} took its place.`
        : 'It was the last song, so playback stopped.'
      : `It was at position ${position}.`
    showToast({ tone: 'success', title: `Removed ${quoted(result.song.title)}`, detail })
  }

  move(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= this.playlist.size) return
    this.playlist.move(fromIndex, toIndex)
  }

  async play(nodeId: string): Promise<void> {
    await this.playback.playNode(nodeId)
  }

  async togglePlay(): Promise<void> {
    if (this.playlist.isEmpty()) {
      showToast({ tone: 'info', title: 'The flight plan is empty', detail: 'Search for a song and add it to start playing.' })
      return
    }
    await this.playback.togglePlay()
  }

  async next(): Promise<void> {
    if (!(await this.playback.next())) {
      showToast({
        tone: 'info',
        title: this.playlist.isEmpty() ? 'Nothing to skip to' : 'This is the last song',
        detail: this.playlist.isEmpty() ? 'Add songs to the flight plan first.' : 'Turn on Repeat all to loop back to the first song.',
      })
    }
  }

  async previous(): Promise<void> {
    if (!(await this.playback.previous())) {
      showToast({
        tone: 'info',
        title: this.playlist.isEmpty() ? 'Nothing to go back to' : 'This is the first song',
        detail: this.playlist.isEmpty() ? 'Add songs to the flight plan first.' : 'Turn on Repeat all to jump to the last song.',
      })
    }
  }

  toggleShuffle(): void {
    const on = this.playlist.toggleShuffle()
    showToast({ tone: 'info', title: on ? 'Shuffle on' : 'Shuffle off', detail: on ? 'The real order stays intact.' : 'Back to the list order.' })
  }

  cycleRepeat(): void {
    const mode = this.playlist.cycleRepeat()
    const copy = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' } as const
    showToast({ tone: 'info', title: copy[mode] })
  }

  private confirmAdd(song: Song, position: number, duplicate: boolean): void {
    showToast({
      tone: 'success',
      title: duplicate ? `Added ${quoted(song.title)} again` : `Added ${quoted(song.title)}`,
      detail: `Position ${position} of ${this.playlist.size}.`,
    })
  }

  private persist(change: PlaylistChange): void {
    if (change === 'restore') return
    savePlaylist(this.playlist.snapshot())
  }

  private announce(notice: PlaybackNotice): void {
    if (notice.type === 'unavailable') {
      showToast({ tone: 'error', title: `Could not play ${quoted(notice.song.title)}`, detail: 'It was marked unavailable and skipped.' })
    } else if (notice.type === 'all_unavailable') {
      showToast({ tone: 'error', title: 'No playable songs left', detail: 'Every song in the flight plan is unavailable.' })
    } else {
      const reason = {
        quota: 'The daily YouTube quota is used up.',
        missing_key: 'The YouTube key is not configured.',
        network: 'YouTube could not be reached.',
        not_found: 'No full version was found on YouTube.',
      }[notice.reason]
      showToast({ tone: 'info', title: `Playing a 30 s preview of ${quoted(notice.song.title)}`, detail: reason })
    }
  }
}
