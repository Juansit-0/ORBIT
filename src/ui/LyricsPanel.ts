import type { PlayerApp } from '../app/PlayerApp.ts'
import type { Song } from '../core/types.ts'
import type { PlaybackState } from '../player/PlaybackController.ts'
import { ServiceError } from '../services/http.ts'
import { activeLineIndex, loadLyrics, type Lyrics } from '../services/lyricsService.ts'
import { el, setText } from './dom.ts'
import { formatTime } from './format.ts'
import { icon } from './icons.ts'
import { reducedMotion } from './motion.ts'

const USER_SCROLL_PAUSE_MS = 3500

export class LyricsPanel {
  readonly root: HTMLElement
  private readonly app: PlayerApp
  private readonly heading: HTMLElement
  private readonly notice: HTMLElement
  private readonly body: HTMLElement
  private lyrics: Lyrics | null = null
  private songId: string | null | undefined = undefined
  private lines: HTMLButtonElement[] = []
  private active = -1
  private abort: AbortController | null = null
  private userScrollUntil = 0
  private lineListener: ((text: string | null) => void) | null = null

  constructor(app: PlayerApp) {
    this.app = app
    this.heading = el('p', { class: 'lyrics__song' })
    this.notice = el('p', { class: 'lyrics__notice', attrs: { hidden: true } })
    this.heading.classList.add('visually-hidden')
    this.body = el('div', { class: 'lyrics__body', attrs: { 'aria-live': 'polite' } })
    this.root = el('section', { class: 'lyrics', attrs: { id: 'pane-lyrics', 'aria-label': 'Lyrics', hidden: true } }, [this.heading, this.notice, this.body])
    this.body.addEventListener('wheel', () => (this.userScrollUntil = performance.now() + USER_SCROLL_PAUSE_MS), { passive: true })
    this.body.addEventListener('touchmove', () => (this.userScrollUntil = performance.now() + USER_SCROLL_PAUSE_MS), { passive: true })
    app.playback.subscribe((state) => this.sync(state))
    app.playlist.subscribe(() => this.sync(app.playback.state))
  }

  get shown(): boolean {
    return !this.root.hidden
  }

  setShown(shown: boolean): void {
    this.root.hidden = !shown
    if (shown) requestAnimationFrame(() => this.center('auto'))
  }

  onActiveLine(listener: (text: string | null) => void): void {
    this.lineListener = listener
  }

  private currentSong(state: PlaybackState): Song | null {
    return state.song ?? (state.nodeId ? null : (this.app.playlist.current?.value ?? null))
  }

  private sync(state: PlaybackState): void {
    const song = this.currentSong(state)
    if ((song?.id ?? null) !== this.songId) {
      this.songId = song?.id ?? null
      void this.load(song)
    }
    const previewing = state.source === 'preview'
    this.notice.hidden = !(previewing && this.lyrics && this.lyrics.synced.length > 0)
    setText(this.notice, 'Lines are not synced while a 30 s preview plays.')
    this.root.dataset.previewing = String(previewing)
    if (!this.lyrics || this.lyrics.synced.length === 0 || previewing || state.source === null) {
      this.highlight(-1)
      return
    }
    this.highlight(activeLineIndex(this.lyrics.synced, state.currentMs + 250))
  }

  private async load(song: Song | null): Promise<void> {
    this.abort?.abort()
    this.lyrics = null
    this.lines = []
    this.active = -1
    if (!song) {
      setText(this.heading, '')
      this.renderMessage('No song in orbit', 'Play a song to see its lyrics here.', 'orbit')
      return
    }
    setText(this.heading, `${song.title} · ${song.artist}`)
    const abort = new AbortController()
    this.abort = abort
    this.body.setAttribute('aria-busy', 'true')
    this.body.replaceChildren(
      el('div', { class: 'lyrics__skeleton', attrs: { 'aria-hidden': 'true' } }, Array.from({ length: 7 }, (_, i) =>
        el('span', { class: 'skeleton skeleton--line', attrs: { style: `width:${55 + ((i * 37) % 40)}%` } }),
      )),
      el('p', { class: 'visually-hidden', text: 'Loading lyrics' }),
    )
    try {
      const lyrics = await loadLyrics(song, abort.signal)
      if (abort.signal.aborted || this.songId !== song.id) return
      this.lyrics = lyrics
      this.render(lyrics)
      this.sync(this.app.playback.state)
    } catch (error) {
      if (abort.signal.aborted || (error instanceof ServiceError && error.kind === 'aborted')) return
      if (error instanceof ServiceError && error.kind === 'not_found') {
        this.renderMessage('No lyrics found', `LRCLIB has no lyrics for “${song.title}” yet.`, 'music')
      } else {
        this.renderError(song)
      }
    } finally {
      if (!abort.signal.aborted) this.body.setAttribute('aria-busy', 'false')
    }
  }

  private render(lyrics: Lyrics): void {
    if (lyrics.instrumental && lyrics.synced.length === 0 && !lyrics.plain) {
      this.renderMessage('Instrumental', 'This track has no lyrics.', 'music')
      return
    }
    if (lyrics.synced.length > 0) {
      this.lines = lyrics.synced.map((line) => {
        const button = el('button', {
          class: 'lyric',
          attrs: { type: 'button', 'data-time': line.timeMs, 'aria-label': line.text ? `${line.text}, at ${formatTime(line.timeMs)}` : `Instrumental break at ${formatTime(line.timeMs)}` },
        }, [line.text || '• • •'])
        if (!line.text) button.classList.add('lyric--break')
        button.addEventListener('click', () => this.seekTo(line.timeMs))
        return button
      })
      this.body.replaceChildren(el('div', { class: 'lyrics__lines' }, this.lines))
      return
    }
    this.body.replaceChildren(
      el('p', { class: 'lyrics__unsynced', text: 'These lyrics are not time-synced.' }),
      el('div', { class: 'lyrics__plain' }, (lyrics.plain ?? '').split(/\n/).map((line) => el('p', { text: line || ' ' }))),
    )
  }

  private renderMessage(title: string, text: string, glyph: 'orbit' | 'music'): void {
    this.body.replaceChildren(
      el('div', { class: 'empty' }, [
        icon(glyph, 'icon empty__icon'),
        el('p', { class: 'empty__title', text: title }),
        el('p', { class: 'empty__text', text }),
      ]),
    )
  }

  private renderError(song: Song): void {
    const retry = el('button', { class: 'button button--quiet', text: 'Try again', attrs: { type: 'button' } })
    retry.addEventListener('click', () => void this.load(song))
    this.body.replaceChildren(
      el('div', { class: 'empty empty--error', attrs: { role: 'alert' } }, [
        icon('alert', 'icon empty__icon'),
        el('p', { class: 'empty__title', text: 'Lyrics are unavailable' }),
        el('p', { class: 'empty__text', text: 'The lyrics service could not be reached.' }),
        retry,
      ]),
    )
  }

  private seekTo(timeMs: number): void {
    const state = this.app.playback.state
    if (state.source !== 'full') return
    this.userScrollUntil = 0
    this.app.playback.seek(timeMs)
    if (state.status !== 'playing') void this.app.togglePlay()
  }

  private highlight(index: number): void {
    if (index === this.active) return
    const synced = this.lyrics?.synced[index]
    this.lineListener?.(synced && synced.text ? synced.text : null)
    const previous = this.lines[this.active]
    if (previous) {
      previous.removeAttribute('aria-current')
      previous.classList.remove('lyric--active')
    }
    this.active = index
    const line = this.lines[index]
    if (!line) return
    line.setAttribute('aria-current', 'true')
    line.classList.add('lyric--active')
    if (performance.now() < this.userScrollUntil) return
    this.center(reducedMotion() ? 'auto' : 'smooth')
  }

  private center(behavior: ScrollBehavior): void {
    const line = this.lines[this.active]
    if (!line || !this.root.offsetParent) return
    const top = line.offsetTop - this.body.clientHeight / 2 + line.offsetHeight / 2
    this.body.scrollTo({ top, behavior })
  }
}
