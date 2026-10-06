import type { PlayerApp } from '../app/PlayerApp.ts'
import type { PlaybackState } from '../player/PlaybackController.ts'
import { el, setText, toggleAttr } from './dom.ts'
import { formatTime } from './format.ts'
import { icon } from './icons.ts'
import { cascadeText, fadeSwap, magnetize } from './motion.ts'

export class NowPlaying {
  readonly root: HTMLElement
  readonly videoHost: HTMLElement
  private readonly app: PlayerApp
  private readonly lens: HTMLElement
  private readonly cover: HTMLImageElement
  private readonly elapsed: HTMLElement
  private readonly total: HTMLElement
  private readonly title: HTMLElement
  private readonly artist: HTMLElement
  private readonly source: HTMLElement
  private readonly seek: HTMLInputElement
  private readonly playButton: HTMLButtonElement
  private readonly prevButton: HTMLButtonElement
  private readonly nextButton: HTMLButtonElement
  private readonly shuffleButton: HTMLButtonElement
  private readonly repeatButton: HTMLButtonElement
  private readonly volume: HTMLInputElement
  private readonly muteButton: HTMLButtonElement
  private readonly emptyText = el('span', { text: 'Nothing in orbit yet' })
  readonly volumeControl: HTMLElement
  readonly stage: HTMLElement
  private seeking = false
  private lastVolume = 80

  constructor(app: PlayerApp, videoHost: HTMLElement) {
    this.app = app
    this.videoHost = videoHost
    videoHost.className = 'lens__video'
    videoHost.id = 'video-host'
    this.cover = el('img', { class: 'lens__cover', attrs: { alt: '', width: 240, height: 240, decoding: 'async' } })
    this.lens = el('figure', { class: 'lens', attrs: { 'data-state': 'empty' } }, [
      this.videoHost,
      this.cover,
      el('figcaption', { class: 'lens__empty' }, [icon('orbit', 'icon lens__empty-icon'), this.emptyText]),
    ])
    this.elapsed = el('span', { class: 'clock__elapsed', text: '0:00' })
    this.total = el('span', { class: 'clock__total', text: '0:00' })
    this.title = el('h1', { class: 'deck__title', text: 'Orbit' })
    this.artist = el('p', { class: 'deck__artist', text: 'Add a song to launch the flight plan.' })
    this.source = el('p', { class: 'badge', attrs: { hidden: true } })
    this.seek = el('input', {
      class: 'range range--seek',
      attrs: { type: 'range', min: 0, max: 1000, step: 1000, value: 0, 'aria-label': 'Seek', disabled: true },
    })
    this.shuffleButton = this.iconButton('shuffle', 'Shuffle', 'transport__mode')
    this.prevButton = this.iconButton('previous', 'Previous song', 'transport__skip')
    this.playButton = el('button', { class: 'play', attrs: { type: 'button', 'aria-label': 'Play' } }, [icon('play', 'icon play__icon')])
    this.nextButton = this.iconButton('next', 'Next song', 'transport__skip')
    this.repeatButton = this.iconButton('repeat', 'Repeat off', 'transport__mode')
    this.muteButton = this.iconButton('volume', 'Mute', 'volume__mute')
    this.volume = el('input', {
      class: 'range range--volume',
      attrs: { type: 'range', min: 0, max: 100, step: 1, value: 80, 'aria-label': 'Volume' },
    })
    this.root = el('main', { class: 'deck', attrs: { id: 'panel-now', 'aria-label': 'Now playing' } }, [
      (this.stage = el('div', { class: 'deck__stage' }, [this.lens])),
      el('div', { class: 'deck__meta' }, [
        el('p', { class: 'clock', attrs: { 'aria-label': 'Elapsed time' } }, [
          el('span', { class: 'clock__label', text: 'T+' }),
          this.elapsed,
          el('span', { class: 'clock__sep', text: '/' }),
          this.total,
        ]),
        this.title,
        this.artist,
        this.source,
      ]),
      el('div', { class: 'deck__controls' }, [
        this.seek,
        el('div', { class: 'transport' }, [this.shuffleButton, this.prevButton, this.playButton, this.nextButton, this.repeatButton]),
      ]),
    ])
    this.volumeControl = el('div', { class: 'volume' }, [this.muteButton, this.volume])
    this.bind()
    for (const button of [this.playButton, this.prevButton, this.nextButton]) magnetize(button, button === this.playButton ? 7 : 5)
    app.playback.subscribe((state) => this.render(state))
    app.playlist.subscribe(() => this.render(app.playback.state))
  }

  private iconButton(name: Parameters<typeof icon>[0], label: string, extra: string): HTMLButtonElement {
    return el('button', { class: `icon-button ${extra}`, attrs: { type: 'button', 'aria-label': label, title: label } }, [icon(name)])
  }

  private bind(): void {
    this.playButton.addEventListener('click', () => void this.app.togglePlay())
    this.prevButton.addEventListener('click', () => void this.app.previous())
    this.nextButton.addEventListener('click', () => void this.app.next())
    this.shuffleButton.addEventListener('click', () => this.app.toggleShuffle())
    this.repeatButton.addEventListener('click', () => this.app.cycleRepeat())
    this.seek.addEventListener('pointerdown', () => (this.seeking = true))
    this.seek.addEventListener('input', () => {
      this.seeking = true
      setText(this.elapsed, formatTime(Number(this.seek.value)))
    })
    this.seek.addEventListener('change', () => {
      this.seeking = false
      this.app.playback.seek(Number(this.seek.value))
    })
    this.volume.addEventListener('input', () => this.app.playback.setVolume(Number(this.volume.value)))
    this.muteButton.addEventListener('click', () => {
      const current = this.app.playback.state.volume
      if (current > 0) {
        this.lastVolume = current
        this.app.playback.setVolume(0)
      } else {
        this.app.playback.setVolume(this.lastVolume || 80)
      }
    })
  }

  private render(state: PlaybackState): void {
    const playlist = this.app.playlist
    const node = state.nodeId ? playlist.list.findById(state.nodeId) : playlist.current
    const song = node?.value ?? null
    const playing = state.status === 'playing' || state.status === 'loading'
    const lensState = !song ? 'empty' : state.source === 'full' ? 'video' : 'cover'
    this.lens.dataset.state = lensState
    this.lens.dataset.status = state.status
    if (song) {
      const src = song.artworkUrl
      if (this.cover.getAttribute('src') !== src) {
        this.cover.src = src
        fadeSwap(this.lens)
      }
      this.cover.alt = `Cover of ${song.album || song.title}`
      cascadeText(this.title, song.title)
      setText(this.artist, song.album ? `${song.artist} · ${song.album}` : song.artist)
    } else {
      this.cover.removeAttribute('src')
      this.title.removeAttribute('aria-label')
      this.title.dataset.cascaded = 'false'
      setText(this.emptyText, playlist.isEmpty() ? 'Nothing in orbit yet' : 'Ready for launch')
      setText(this.title, 'Orbit')
      setText(this.artist, playlist.isEmpty() ? 'Add a song to launch the flight plan.' : 'Press play to start at the head of the list.')
    }
    const sourceText =
      state.status === 'loading' && song
        ? 'Tuning in…'
        : state.source === 'full'
          ? 'Full track'
          : state.source === 'preview'
            ? '30 s preview'
            : ''
    this.source.hidden = sourceText === ''
    this.source.dataset.tone = state.source === 'preview' ? 'preview' : 'full'
    setText(this.source, sourceText)
    const duration = state.durationMs || song?.durationMs || 0
    setText(this.total, formatTime(duration))
    if (!this.seeking) {
      setText(this.elapsed, formatTime(state.currentMs))
      this.seek.max = String(Math.max(1000, Math.floor(duration)))
      this.seek.value = String(Math.floor(state.currentMs))
    }
    this.seek.style.setProperty('--fill', `${duration > 0 ? Math.min(100, (Number(this.seek.value) / duration) * 100) : 0}%`)
    toggleAttr(this.seek, 'disabled', state.source === null)
    this.seek.setAttribute('aria-valuetext', `${formatTime(state.currentMs)} of ${formatTime(duration)}`)
    this.playButton.replaceChildren(icon(playing ? 'pause' : 'play', 'icon play__icon'))
    this.playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    this.playButton.dataset.loading = String(state.status === 'loading')
    this.updateSkip(this.prevButton, playlist.hasPrevious(), playlist.isEmpty() ? 'Add songs first' : 'This is the first song', 'Previous song')
    this.updateSkip(this.nextButton, playlist.hasNext(), playlist.isEmpty() ? 'Add songs first' : 'This is the last song', 'Next song')
    this.shuffleButton.setAttribute('aria-pressed', String(playlist.shuffle))
    this.shuffleButton.title = playlist.shuffle ? 'Shuffle on' : 'Shuffle off'
    const repeatLabel = { off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' }[playlist.repeat]
    this.repeatButton.setAttribute('aria-pressed', String(playlist.repeat !== 'off'))
    this.repeatButton.setAttribute('aria-label', repeatLabel)
    this.repeatButton.title = repeatLabel
    this.repeatButton.replaceChildren(icon(playlist.repeat === 'one' ? 'repeatOne' : 'repeat'))
    this.volume.value = String(state.volume)
    this.volume.style.setProperty('--fill', `${state.volume}%`)
    this.muteButton.replaceChildren(icon(state.volume === 0 ? 'mute' : 'volume'))
    this.muteButton.setAttribute('aria-label', state.volume === 0 ? 'Unmute' : 'Mute')
  }

  private updateSkip(button: HTMLButtonElement, enabled: boolean, reason: string, label: string): void {
    button.setAttribute('aria-disabled', String(!enabled))
    button.title = enabled ? label : reason
  }
}
