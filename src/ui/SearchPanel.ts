import type { Song } from '../core/types.ts'
import type { PlayerApp } from '../app/PlayerApp.ts'
import { searchSongs } from '../services/searchService.ts'
import { ServiceError } from '../services/http.ts'
import { el, setText } from './dom.ts'
import { formatTime } from './format.ts'
import { icon } from './icons.ts'

const DEBOUNCE_MS = 350

export class SearchPanel {
  readonly root: HTMLElement
  readonly input: HTMLInputElement
  private readonly app: PlayerApp
  private readonly body: HTMLElement
  private readonly clear: HTMLButtonElement
  private timer: number | undefined
  private abort: AbortController | null = null
  private lastTerm = ''

  constructor(app: PlayerApp) {
    this.app = app
    this.input = el('input', {
      class: 'search__input',
      attrs: {
        id: 'search-input',
        type: 'search',
        placeholder: 'Song, artist or album',
        autocomplete: 'off',
        spellcheck: 'false',
        enterkeyhint: 'search',
      },
    })
    this.clear = el('button', {
      class: 'icon-button search__clear',
      attrs: { type: 'button', 'aria-label': 'Clear search', hidden: true },
    }, [icon('close')])
    const form = el('form', { class: 'search', attrs: { role: 'search' } }, [
      el('label', { class: 'visually-hidden', text: 'Search songs', attrs: { for: 'search-input' } }),
      icon('search', 'icon search__icon'),
      this.input,
      this.clear,
    ])
    this.body = el('div', { class: 'rail__body', attrs: { 'aria-live': 'polite' } })
    this.root = el('aside', { class: 'rail rail--search', attrs: { id: 'panel-search', 'aria-labelledby': 'search-heading' } }, [
      el('header', { class: 'rail__head' }, [el('h2', { class: 'rail__title', text: 'Search', attrs: { id: 'search-heading' } })]),
      form,
      this.body,
    ])
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      this.run(this.input.value, true)
    })
    this.input.addEventListener('input', () => {
      this.clear.hidden = this.input.value.length === 0
      window.clearTimeout(this.timer)
      this.timer = window.setTimeout(() => this.run(this.input.value, false), DEBOUNCE_MS)
    })
    this.clear.addEventListener('click', () => {
      this.input.value = ''
      this.clear.hidden = true
      this.abort?.abort()
      this.lastTerm = ''
      this.renderIdle()
      this.input.focus()
    })
    app.playlist.subscribe(() => this.refreshPositionHints())
    this.renderIdle()
  }

  focus(): void {
    this.input.focus()
    this.input.select()
  }

  private async run(raw: string, force: boolean): Promise<void> {
    const term = raw.trim()
    if (term.length === 0) {
      this.lastTerm = ''
      this.renderIdle()
      return
    }
    if (term.length < 2) {
      this.renderMessage('Keep typing', 'Type at least 2 characters to search.')
      return
    }
    if (term === this.lastTerm && !force) return
    this.lastTerm = term
    this.abort?.abort()
    const abort = new AbortController()
    this.abort = abort
    this.renderLoading()
    try {
      const songs = await searchSongs(term, abort.signal)
      if (abort.signal.aborted) return
      if (songs.length === 0) this.renderMessage(`No songs match “${term}”`, 'Check the spelling or try the artist name.')
      else this.renderResults(songs)
    } catch (error) {
      if (error instanceof ServiceError && error.kind === 'aborted') return
      if (abort.signal.aborted) return
      this.renderError(term)
    }
  }

  private renderIdle(): void {
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('div', { class: 'empty' }, [
        icon('music', 'icon empty__icon'),
        el('p', { class: 'empty__title', text: 'Find any song' }),
        el('p', { class: 'empty__text', text: 'Search the iTunes catalog, then add the song at the start, the end or an exact position. Songs play in full.' }),
      ]),
    )
  }

  private renderMessage(title: string, text: string): void {
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('div', { class: 'empty' }, [
        el('p', { class: 'empty__title', text: title }),
        el('p', { class: 'empty__text', text }),
      ]),
    )
  }

  private renderError(term: string): void {
    const retry = el('button', { class: 'button button--quiet', text: 'Try again', attrs: { type: 'button' } })
    retry.addEventListener('click', () => this.run(term, true))
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('div', { class: 'empty empty--error', attrs: { role: 'alert' } }, [
        icon('alert', 'icon empty__icon'),
        el('p', { class: 'empty__title', text: 'Search is unavailable' }),
        el('p', { class: 'empty__text', text: 'The catalog could not be reached. Check your connection and try again.' }),
        retry,
      ]),
    )
  }

  private renderLoading(): void {
    this.body.setAttribute('aria-busy', 'true')
    const rows = Array.from({ length: 6 }, () =>
      el('li', { class: 'result result--skeleton', attrs: { 'aria-hidden': 'true' } }, [
        el('span', { class: 'skeleton skeleton--cover' }),
        el('span', { class: 'result__meta' }, [
          el('span', { class: 'skeleton skeleton--line' }),
          el('span', { class: 'skeleton skeleton--line skeleton--short' }),
        ]),
      ]),
    )
    this.body.replaceChildren(el('p', { class: 'visually-hidden', text: 'Searching' }), el('ul', { class: 'results' }, rows))
  }

  private renderResults(songs: Song[]): void {
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('p', { class: 'results__count', text: `${songs.length} results` }),
      el('ul', { class: 'results' }, songs.map((song) => this.renderResult(song))),
    )
  }

  private renderResult(song: Song): HTMLElement {
    const label = `${song.title} by ${song.artist}`
    const insertInput = el('input', {
      class: 'insert__input',
      attrs: { type: 'number', inputmode: 'numeric', min: 1, step: 1, 'aria-describedby': '' },
    })
    const hint = el('p', { class: 'insert__hint' })
    const error = el('p', { class: 'insert__error', attrs: { role: 'alert' } })
    const hintId = `hint-${song.id}-${Math.random().toString(36).slice(2, 7)}`
    hint.id = hintId
    insertInput.setAttribute('aria-describedby', hintId)
    const insertForm = el('form', { class: 'insert', attrs: { hidden: true, novalidate: true } }, [
      el('label', { class: 'insert__label' }, [el('span', { text: 'Position' }), insertInput]),
      el('button', { class: 'button button--primary button--small', text: 'Insert', attrs: { type: 'submit' } }),
      el('button', { class: 'button button--quiet button--small insert__cancel', text: 'Cancel', attrs: { type: 'button' } }),
      hint,
      error,
    ])
    const atButton = el('button', {
      class: 'chip',
      attrs: { type: 'button', 'aria-expanded': 'false', 'aria-label': `Insert ${label} at a position` },
    }, [icon('insert'), el('span', { text: 'At…' })])
    const firstButton = el('button', {
      class: 'chip',
      attrs: { type: 'button', 'aria-label': `Add ${label} at the start` },
    }, [icon('toFirst'), el('span', { text: 'First' })])
    const lastButton = el('button', {
      class: 'chip',
      attrs: { type: 'button', 'aria-label': `Add ${label} at the end` },
    }, [icon('toLast'), el('span', { text: 'Last' })])
    const item = el('li', { class: 'result' }, [
      el('img', { class: 'result__cover', attrs: { src: song.artworkUrl.replace('600x600', '120x120'), alt: '', width: 48, height: 48, loading: 'lazy', decoding: 'async' } }),
      el('div', { class: 'result__meta' }, [
        el('p', { class: 'result__title', text: song.title }),
        el('p', { class: 'result__artist', text: `${song.artist} · ${formatTime(song.durationMs)}` }),
      ]),
      el('div', { class: 'result__actions' }, [firstButton, lastButton, atButton]),
      insertForm,
    ])
    const setOpen = (open: boolean) => {
      insertForm.hidden = !open
      atButton.setAttribute('aria-expanded', String(open))
      item.classList.toggle('result--inserting', open)
      if (open) {
        this.updateHint(insertInput, hint)
        const suggested = Math.min(this.app.playlist.indexOfCurrent() + 2 || 1, this.app.playlist.size + 1)
        insertInput.value = String(Math.max(1, suggested))
        error.textContent = ''
        insertInput.removeAttribute('aria-invalid')
        insertInput.focus()
        insertInput.select()
      }
    }
    firstButton.addEventListener('click', () => this.app.addFirst(song))
    lastButton.addEventListener('click', () => this.app.addLast(song))
    atButton.addEventListener('click', () => setOpen(!item.classList.contains('result--inserting')))
    insertForm.querySelector('.insert__cancel')?.addEventListener('click', () => {
      setOpen(false)
      atButton.focus()
    })
    insertForm.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
        atButton.focus()
      }
    })
    insertInput.addEventListener('input', () => {
      error.textContent = ''
      insertInput.removeAttribute('aria-invalid')
    })
    insertForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const raw = insertInput.value.trim()
      const position = raw === '' ? Number.NaN : Number(raw)
      const result = this.app.insertAt(position, song)
      if (result.ok) {
        setOpen(false)
        atButton.focus()
      } else {
        error.textContent = raw === '' ? 'Enter a position number.' : result.error
        insertInput.setAttribute('aria-invalid', 'true')
        insertInput.focus()
      }
    })
    return item
  }

  private updateHint(input: HTMLInputElement, hint: HTMLElement): void {
    const max = this.app.playlist.size + 1
    input.max = String(max)
    setText(hint, max === 1 ? 'The list is empty, so it goes to position 1.' : `1 puts it first, ${max} puts it last.`)
  }

  private refreshPositionHints(): void {
    for (const form of this.body.querySelectorAll<HTMLFormElement>('.insert:not([hidden])')) {
      const input = form.querySelector<HTMLInputElement>('.insert__input')
      const hint = form.querySelector<HTMLElement>('.insert__hint')
      if (input && hint) this.updateHint(input, hint)
    }
  }
}
