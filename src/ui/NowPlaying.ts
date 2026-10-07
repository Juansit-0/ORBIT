import type { PlayerApp } from '../app/PlayerApp.ts'
import type { PlaybackState } from '../player/PlaybackController.ts'
import { el, setText, toggleAttr } from './dom.ts'
import { formatTime } from './format.ts'
import { icon } from './icons.ts'
import { coverShown, START_HOLD_MS } from './coverReveal.ts'
import { LiquidProgress } from './LiquidProgress.ts'
import { classifySwipe } from './gestures.ts'
import { cascadeText, fadeSwap, magnetize, reducedMotion } from './motion.ts'

export class NowPlaying {
  readonly root: HTMLElement
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
  readonly lyricsButton: HTMLButtonElement
  readonly tags: HTMLElement
  private readonly planTag: HTMLButtonElement
  private readonly karaoke: HTMLElement
  private readonly peek: HTMLElement
  private readonly scale = el('div', { class: 'seek-scale', attrs: { 'aria-hidden': 'true' } })
  private readonly liquid = new LiquidProgress()
  private seeking = false
  private hovering = false
  private holdUntil = 0
  private lastNodeId: string | null = null
  private wasPlaying = false
  private holdPending = true
  private revealTimer: number | undefined
  private leaveTimer: number | undefined
  private revealListener: ((shown: boolean) => void) | null = null
  private lastShown: boolean | null = null
  private lastVolume = 80

  constructor(app: PlayerApp) {
    this.app = app
    this.cover = el('img', { class: 'lens__cover', attrs: { alt: '', width: 240, height: 240, decoding: 'async' } })
    this.lens = el('figure', { class: 'lens', attrs: { 'data-state': 'empty', 'data-cover': 'shown' } }, [
      this.cover,
      el('figcaption', { class: 'lens__empty' }, [icon('orbit', 'icon lens__empty-icon'), this.emptyText]),
    ])
    this.elapsed = el('span', { class: 'clock__elapsed', text: '0:00' })
    this.total = el('span', { class: 'clock__total', text: '0:00' })
    this.title = el('h1', { class: 'deck__title', text: 'Orbit' })
    this.karaoke = el('p', { class: 'deck__karaoke', attrs: { 'aria-hidden': 'true' } })
    this.artist = el('p', { class: 'deck__artist', text: 'Add a song to launch the flight plan.' })
    this.source = el('p', { class: 'badge', attrs: { hidden: true } })
    this.planTag = el('button', {
      class: 'chip deck__chip plan-tag',
      attrs: {
        type: 'button',
        hidden: true,
        title: 'Not in your flight plan. Add it at the end.',
        'aria-label': 'Not in your flight plan. Add to plan',
      },
    }, [icon('plus'), el('span', { text: 'Add to plan' })])
    this.planTag.addEventListener('click', () => void this.app.addPlayingToPlan())
    this.lyricsButton = el('button', {
      class: 'chip deck__chip deck__lyrics',
      attrs: { type: 'button', 'aria-pressed': 'false', 'aria-controls': 'pane-lyrics' },
    }, [icon('lyrics'), el('span', { text: 'Lyrics' })])
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
        this.karaoke,
        (this.tags = el('div', { class: 'deck__tags' }, [this.source, this.planTag, this.lyricsButton])),
      ]),
      el('div', { class: 'deck__controls' }, [
        el('div', { class: 'seek' }, [el('div', { class: 'seek__bar' }, [this.liquid.canvas, this.seek]), this.scale]),
        el('div', { class: 'transport' }, [
          this.shuffleButton,
          this.prevButton,
          this.playButton,
          this.nextButton,
          this.repeatButton,
          (this.peek = el('div', { class: 'peek', attrs: { role: 'tooltip', id: 'peek', hidden: true } })),
        ]),
      ]),
    ])
    this.volumeControl = el('div', { class: 'volume' }, [this.muteButton, this.volume])
    this.bind()
    for (const button of [this.playButton, this.prevButton, this.nextButton]) magnetize(button, button === this.playButton ? 7 : 5)
    for (const [button, direction] of [
      [this.nextButton, 'next'],
      [this.prevButton, 'previous'],
    ] as const) {
      const show = () => this.showPeek(button, direction)
      const hide = () => {
        this.peek.hidden = true
        button.removeAttribute('aria-describedby')
      }
      button.addEventListener('pointerenter', show)
      button.addEventListener('focus', show)
      button.addEventListener('pointerleave', hide)
      button.addEventListener('blur', hide)
      button.addEventListener('click', () => window.setTimeout(() => (this.peek.hidden ? undefined : show()), 60))
    }
    this.stage.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || document.documentElement.dataset.cinema === 'true') return
      window.clearTimeout(this.leaveTimer)
      this.setHovering(true)
    })
    this.stage.addEventListener('pointerleave', (event) => {
      if (event.pointerType !== 'mouse') return
      window.clearTimeout(this.leaveTimer)
      this.leaveTimer = window.setTimeout(() => this.setHovering(false), 350)
    })
    this.bindSwipe()
    app.playback.subscribe((state) => this.render(state))
    app.playlist.subscribe(() => this.render(app.playback.state))
  }

  private setArtist(artist: string, album: string): void {
    if (this.artist.dataset.artist === artist && this.artist.dataset.album === album) return
    this.artist.dataset.artist = artist
    this.artist.dataset.album = album
    this.artist.replaceChildren(
      el('span', { class: 'deck__artist-name', text: artist, attrs: { title: artist } }),
      album ? el('span', { class: 'deck__album', text: album }) : '',
    )
  }

  mountLyrics(pane: HTMLElement): void {
    this.root.querySelector('.deck__controls')?.before(pane)
  }

  onCoverReveal(listener: (shown: boolean) => void): void {
    this.revealListener = listener
    this.lastShown = null
    this.evaluateReveal()
  }

  private showPeek(button: HTMLButtonElement, direction: 'next' | 'previous'): void {
    const playlist = this.app.playlist
    const state = this.app.playback.state
    const loose = Boolean(state.song && !state.inPlan)
    const node = loose ? (playlist.current ?? playlist.peekNext()) : direction === 'next' ? playlist.peekNext() : playlist.peekPrevious()
    const label = loose ? 'Back to your flight plan' : direction === 'next' ? 'Up next' : 'Previous'
    if (!node) {
      this.peek.replaceChildren(
        el('span', { class: 'peek__label', text: direction === 'next' ? 'End of the flight plan' : 'Start of the flight plan' }),
        el('span', { class: 'peek__hint', text: playlist.isEmpty() ? 'Add songs to start.' : 'Repeat all loops around.' }),
      )
    } else {
      const position = playlist.list.indexOf(node) + 1
      this.peek.replaceChildren(
        el('img', { class: 'peek__cover', attrs: { src: node.value.artworkUrl.replace('600x600', '120x120'), alt: '', width: 40, height: 40 } }),
        el('span', { class: 'peek__text' }, [
          el('span', { class: 'peek__label', text: `${label} · #${position}` }),
          el('span', { class: 'peek__title', text: node.value.title }),
          el('span', { class: 'peek__artist', text: node.value.artist }),
        ]),
      )
    }
    this.peek.dataset.side = direction
    this.peek.hidden = false
    button.setAttribute('aria-describedby', 'peek')
  }

  setKaraoke(text: string | null): void {
    if (this.karaoke.textContent === (text ?? '')) return
    this.karaoke.dataset.empty = String(!text)
    this.karaoke.textContent = text ?? ''
    if (text) this.karaoke.animate?.([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' })
  }

  lensRect(): DOMRect | null {
    const rect = this.lens.getBoundingClientRect()
    return rect.width > 0 ? rect : null
  }

  private bindSwipe(): void {
    let start: { x: number; y: number; time: number; id: number } | null = null
    const release = (dx: number) => {
      this.lens.style.transition = 'transform 420ms cubic-bezier(0.16, 1, 0.3, 1)'
      this.lens.style.transform = dx === 0 ? '' : `translateX(${dx}px)`
      window.setTimeout(() => {
        this.lens.style.transform = ''
        window.setTimeout(() => (this.lens.style.transition = ''), 420)
      }, dx === 0 ? 0 : 160)
    }
    this.stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse') return
      start = { x: event.clientX, y: event.clientY, time: performance.now(), id: event.pointerId }
    })
    this.stage.addEventListener('pointermove', (event) => {
      if (!start || event.pointerId !== start.id) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        this.lens.style.transition = 'none'
        this.lens.style.transform = `translateX(${dx * 0.45}px) rotate(${dx * 0.02}deg)`
      }
    })
    const finish = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      const swipe = event.type === 'pointerup' ? classifySwipe(dx, dy, performance.now() - start.time) : null
      start = null
      if (swipe === 'left') {
        release(-60)
        void this.app.next()
      } else if (swipe === 'right') {
        release(60)
        void this.app.previous()
      } else {
        release(0)
        if (event.type === 'pointerup' && Math.hypot(dx, dy) < 10) {
          window.clearTimeout(this.leaveTimer)
          this.setHovering(true)
          this.leaveTimer = window.setTimeout(() => this.setHovering(false), 3000)
        }
      }
    }
    this.stage.addEventListener('pointerup', finish)
    this.stage.addEventListener('pointercancel', finish)
  }

  resetHover(): void {
    window.clearTimeout(this.leaveTimer)
    this.setHovering(false)
  }

  private setHovering(hovering: boolean): void {
    if (this.hovering === hovering) return
    this.hovering = hovering
    this.evaluateReveal()
  }

  private evaluateReveal(): void {
    const state = this.app.playback.state
    const scene = document.documentElement.classList.contains('has-scene')
    const shown = coverShown({
      hasSong: this.lens.dataset.state === 'cover',
      playing: state.status === 'playing',
      hovering: this.hovering,
      now: performance.now(),
      holdUntil: this.holdUntil,
      reducedMotion: reducedMotion() || !scene,
    })
    this.lens.dataset.cover = shown ? 'shown' : 'hidden'
    window.clearTimeout(this.revealTimer)
    const wait = this.holdUntil - performance.now()
    if (shown && wait > 0) this.revealTimer = window.setTimeout(() => this.evaluateReveal(), wait + 20)
    if (shown !== this.lastShown) {
      this.lastShown = shown
      this.revealListener?.(shown)
    }
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
    const song = state.song ?? (state.nodeId ? null : (playlist.current?.value ?? null))
    this.planTag.hidden = !(state.song && !state.inPlan)
    const playing = state.status === 'playing' || state.status === 'loading'
    this.lens.dataset.state = song ? 'cover' : 'empty'
    const playingNow = state.status === 'playing'
    if (state.nodeId !== this.lastNodeId) this.holdPending = true
    if (playingNow && (this.holdPending || (!this.wasPlaying && state.currentMs < 1500))) {
      this.holdUntil = performance.now() + START_HOLD_MS
      this.holdPending = false
    }
    this.lastNodeId = state.nodeId
    this.wasPlaying = playingNow
    this.lens.dataset.status = state.status
    if (song) {
      const src = song.artworkUrl
      if (this.cover.getAttribute('src') !== src) {
        this.cover.src = src
        fadeSwap(this.lens)
      }
      this.cover.alt = `Cover of ${song.album || song.title}`
      cascadeText(this.title, song.title)
      this.setArtist(song.artist, song.album)
    } else {
      this.cover.removeAttribute('src')
      this.title.removeAttribute('aria-label')
      this.title.dataset.cascaded = 'false'
      setText(this.emptyText, playlist.isEmpty() ? 'Nothing in orbit yet' : 'Ready for launch')
      setText(this.title, 'Orbit')
      this.setArtist(playlist.isEmpty() ? 'Add a song to launch the flight plan.' : 'Press play to start at the head of the list.', '')
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
    this.scale.style.setProperty('--minutes', String(Math.max(1, duration / 60000)))
    if (!this.seeking) {
      setText(this.elapsed, formatTime(state.currentMs))
      this.seek.max = String(Math.max(1000, Math.floor(duration)))
      this.seek.value = String(Math.floor(state.currentMs))
    }
    const fraction = duration > 0 ? Math.min(1, Number(this.seek.value) / duration) : 0
    this.seek.style.setProperty('--fill', `${fraction * 100}%`)
    this.liquid.update(fraction, state.status === 'playing')
    toggleAttr(this.seek, 'disabled', state.source === null)
    this.seek.setAttribute('aria-valuetext', `${formatTime(state.currentMs)} of ${formatTime(duration)}`)
    this.playButton.replaceChildren(icon(playing ? 'pause' : 'play', 'icon play__icon'))
    this.playButton.setAttribute('aria-label', playing ? 'Pause' : 'Play')
    this.playButton.dataset.loading = String(state.status === 'loading')
    const loose = Boolean(state.song && !state.inPlan)
    const resume = 'Back to your flight plan'
    this.updateSkip(this.prevButton, loose ? !playlist.isEmpty() : playlist.hasPrevious(), playlist.isEmpty() ? 'Add songs first' : 'This is the first song', loose ? resume : 'Previous song')
    this.updateSkip(this.nextButton, loose ? !playlist.isEmpty() : playlist.hasNext(), playlist.isEmpty() ? 'Add songs first' : 'This is the last song', loose ? resume : 'Next song')
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
    this.evaluateReveal()
  }

  private updateSkip(button: HTMLButtonElement, enabled: boolean, reason: string, label: string): void {
    button.setAttribute('aria-disabled', String(!enabled))
    button.title = enabled ? label : reason
  }
}
