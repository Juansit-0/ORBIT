import type { PlayerApp } from '../app/PlayerApp.ts'
import { buildMix, mixName } from '../app/mixMaker.ts'
import type { Song } from '../core/types.ts'
import { searchSongs } from '../services/searchService.ts'
import { el, setText } from './dom.ts'
import { formatTime, plural } from './format.ts'
import { icon } from './icons.ts'

export class MixDialog {
  readonly dialog: HTMLDialogElement
  private readonly app: PlayerApp
  private readonly input: HTMLInputElement
  private readonly body: HTMLElement
  private readonly footer: HTMLElement
  private readonly summary: HTMLElement
  private readonly create: HTMLButtonElement
  private readonly makeButton: HTMLButtonElement
  private songs: Song[] = []
  private seed = ''
  private request = 0

  constructor(app: PlayerApp) {
    this.app = app
    this.input = el('input', {
      class: 'mix__input',
      attrs: { id: 'mix-seed', type: 'text', placeholder: 'An artist, a genre or a song', autocomplete: 'off', spellcheck: 'false' },
    })
    this.makeButton = el('button', { class: 'button button--primary', text: 'Make mix', attrs: { type: 'submit' } })
    const form = el('form', { class: 'mix__form', attrs: { novalidate: true } }, [
      el('label', { class: 'visually-hidden', text: 'Make a mix from', attrs: { for: 'mix-seed' } }),
      icon('dj', 'icon mix__icon'),
      this.input,
      this.makeButton,
    ])
    this.body = el('div', { class: 'mix__body', attrs: { 'aria-live': 'polite' } })
    this.summary = el('p', { class: 'mix__summary' })
    this.create = el('button', { class: 'button button--primary', text: 'Create playlist', attrs: { type: 'button' } })
    const cancel = el('button', { class: 'button button--quiet', text: 'Cancel', attrs: { type: 'button' } })
    this.footer = el('footer', { class: 'mix__footer' }, [this.summary, el('div', { class: 'mix__buttons' }, [cancel, this.create])])
    this.dialog = el('dialog', { class: 'mix', attrs: { 'aria-labelledby': 'mix-title' } }, [
      el('header', { class: 'mix__head' }, [
        el('h2', { class: 'mix__title', text: 'Make a mix', attrs: { id: 'mix-title' } }),
        el('p', { class: 'mix__lead', text: 'Type an artist, a genre or a song. Orbit picks up to 20 songs around it, spreads the artists out and saves them as a new playlist.' }),
      ]),
      form,
      this.body,
      this.footer,
    ])
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      void this.make(this.input.value)
    })
    cancel.addEventListener('click', () => this.dialog.close())
    this.create.addEventListener('click', () => this.save())
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.dialog.addEventListener('close', () => {
      this.request += 1
    })
  }

  open(seed = ''): void {
    this.songs = []
    this.seed = ''
    this.input.value = seed
    this.renderIdle()
    if (!this.dialog.open) this.dialog.showModal()
    this.input.focus()
    if (seed.trim().length >= 2) void this.make(seed)
  }

  private async make(raw: string): Promise<void> {
    const seed = raw.trim().replace(/\s+/g, ' ')
    if (seed.length < 2) {
      this.renderMessage('Type at least 2 characters.', null)
      this.input.focus()
      return
    }
    const request = ++this.request
    this.seed = seed
    this.renderLoading()
    try {
      const songs = await buildMix(seed, (term) => searchSongs(term))
      if (request !== this.request) return
      this.songs = songs
      if (songs.length === 0) this.renderMessage(`No songs found for “${seed}”. Try an artist name or a genre.`, null)
      else this.renderList()
    } catch {
      if (request !== this.request) return
      this.renderMessage('The catalog could not be reached.', () => void this.make(seed))
    }
  }

  private save(): void {
    if (this.songs.length === 0) return
    const result = this.app.importPlaylist(mixName(this.seed), this.songs, 'mix')
    if (result.ok) this.dialog.close()
  }

  private setResults(shown: boolean): void {
    this.summary.hidden = !shown
    this.create.hidden = !shown
    this.makeButton.classList.toggle('button--primary', !shown)
    this.makeButton.classList.toggle('button--quiet', shown)
  }

  private renderIdle(): void {
    this.setResults(false)
    this.body.replaceChildren(
      el('div', { class: 'mix__ideas' }, ['Daft Punk', 'Bad Bunny', 'Lo-fi', '80s rock', 'Salsa'].map((idea) => {
        const chip = el('button', { class: 'chip', text: idea, attrs: { type: 'button' } })
        chip.addEventListener('click', () => {
          this.input.value = idea
          void this.make(idea)
        })
        return chip
      })),
    )
  }

  private renderLoading(): void {
    this.setResults(false)
    this.body.setAttribute('aria-busy', 'true')
    this.body.replaceChildren(
      el('p', { class: 'visually-hidden', text: 'Making the mix' }),
      el('ul', { class: 'mix__list' }, Array.from({ length: 5 }, () =>
        el('li', { class: 'mix__row', attrs: { 'aria-hidden': 'true' } }, [
          el('span', { class: 'skeleton skeleton--cover' }),
          el('span', { class: 'mix__meta' }, [el('span', { class: 'skeleton skeleton--line' }), el('span', { class: 'skeleton skeleton--line skeleton--short' })]),
        ]),
      )),
    )
  }

  private renderMessage(text: string, retry: (() => void) | null): void {
    this.setResults(false)
    this.body.setAttribute('aria-busy', 'false')
    const children: HTMLElement[] = [el('p', { text })]
    if (retry) {
      const button = el('button', { class: 'button button--quiet button--small', text: 'Try again', attrs: { type: 'button' } })
      button.addEventListener('click', retry)
      children.push(button)
    }
    this.body.replaceChildren(el('div', { class: 'mix__note', attrs: { role: retry ? 'alert' : 'status' } }, children))
  }

  private renderList(): void {
    this.body.setAttribute('aria-busy', 'false')
    this.setResults(true)
    const total = this.songs.reduce((sum, song) => sum + song.durationMs, 0)
    setText(this.summary, `${mixName(this.seed)} · ${plural(this.songs.length, 'song')} · ${formatTime(total)}`)
    this.create.disabled = this.songs.length === 0
    this.body.replaceChildren(
      el('ol', { class: 'mix__list' }, this.songs.map((song, index) => {
        const remove = el('button', {
          class: 'icon-button icon-button--small',
          attrs: { type: 'button', 'aria-label': `Leave ${song.title} out of the mix`, title: 'Leave out' },
        }, [icon('close')])
        remove.addEventListener('click', () => {
          this.songs = this.songs.filter((entry) => entry !== song)
          if (this.songs.length === 0) this.renderMessage('Every song was left out. Make a new mix.', null)
          else {
            this.renderList()
            this.body.querySelectorAll<HTMLButtonElement>('.mix__row .icon-button')[Math.min(index, this.songs.length - 1)]?.focus()
          }
        })
        return el('li', { class: 'mix__row' }, [
          el('img', { class: 'mix__cover', attrs: { src: song.artworkUrl.replace('600x600', '120x120'), alt: '', width: 40, height: 40, loading: 'lazy' } }),
          el('span', { class: 'mix__meta' }, [
            el('span', { class: 'mix__song', text: song.title }),
            el('span', { class: 'mix__artist', text: `${song.artist} · ${formatTime(song.durationMs)}` }),
          ]),
          remove,
        ])
      })),
    )
  }
}
