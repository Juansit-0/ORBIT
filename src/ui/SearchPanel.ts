import type { Song } from '../core/types.ts'
import type { PlayerApp } from '../app/PlayerApp.ts'
import { searchSongs } from '../services/searchService.ts'
import { ServiceError } from '../services/http.ts'
import { el, setText } from './dom.ts'
import { formatTime } from './format.ts'
import { icon } from './icons.ts'
import { endSongDrag, startSongDrag } from './dropInsert.ts'
import type { PlayHistory } from '../services/history.ts'
import { chartSongs, countryFromLocale } from '../services/chartsService.ts'

const CHARTS_PREVIEW = 10

function regionName(country: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(country.toUpperCase()) ?? country.toUpperCase()
  } catch {
    return country.toUpperCase()
  }
}

const DEBOUNCE_MS = 350

export class SearchPanel {
  readonly root: HTMLElement
  readonly input: HTMLInputElement
  private readonly app: PlayerApp
  private readonly body: HTMLElement
  private readonly panel: HTMLElement
  private readonly clear: HTMLButtonElement
  private timer: number | undefined
  private abort: AbortController | null = null
  private lastTerm = ''
  private idle = true
  private charts: Song[] | 'loading' | 'error' | null = null
  private chartsExpanded = false
  private readonly country = countryFromLocale(navigator.language)
  private readonly history: PlayHistory | null

  constructor(app: PlayerApp, history: PlayHistory | null = null) {
    this.app = app
    this.history = history
    this.input = el('input', {
      class: 'search__input',
      attrs: {
        id: 'search-input',
        type: 'search',
        placeholder: 'Song, artist or album',
        autocomplete: 'off',
        spellcheck: 'false',
        enterkeyhint: 'search',
        'aria-controls': 'search-results',
        'aria-expanded': 'false',
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
    this.body = el('div', { class: 'finder__body', attrs: { 'aria-live': 'polite' } })
    this.panel = el('div', { class: 'finder__panel', attrs: { id: 'search-results', role: 'region', 'aria-label': 'Search results' } }, [this.body])
    this.root = el('div', { class: 'finder', attrs: { id: 'panel-search', 'data-open': 'false' } }, [form, this.panel])
    this.input.addEventListener('focus', () => this.open())
    this.input.addEventListener('click', () => this.open())
    this.root.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || this.root.dataset.open !== 'true') return
      event.preventDefault()
      event.stopPropagation()
      this.close()
      this.input.focus()
    })
    document.addEventListener('pointerdown', (event) => {
      if (event.target instanceof Node && this.root.contains(event.target)) return
      this.close()
    }, true)
    this.root.addEventListener('focusout', (event) => {
      const next = event.relatedTarget
      if (next instanceof Node && this.root.contains(next)) return
      if (next instanceof HTMLElement) this.close()
    })
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      this.run(this.input.value, true)
    })
    this.input.addEventListener('input', () => {
      this.open()
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
    history?.subscribe(() => {
      if (this.idle && this.input.value.trim() === '') this.renderIdle()
    })
    this.renderIdle()
  }

  focus(): void {
    this.input.focus()
    this.input.select()
    this.open()
  }

  get isOpen(): boolean {
    return this.root.dataset.open === 'true'
  }

  open(): void {
    void this.loadCharts()
    if (this.isOpen) return
    this.root.dataset.open = 'true'
    this.input.setAttribute('aria-expanded', 'true')
  }

  close(): void {
    if (!this.isOpen) return
    this.root.dataset.open = 'false'
    this.input.setAttribute('aria-expanded', 'false')
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
    this.idle = true
    this.body.setAttribute('aria-busy', 'false')
    const recent = this.history?.entries().slice(0, 8) ?? []
    const sections: HTMLElement[] = []
    if (recent.length > 0) {
      const clear = el('button', { class: 'button button--quiet button--small', text: 'Clear', attrs: { type: 'button', 'aria-label': 'Clear recently played' } })
      clear.addEventListener('click', () => {
        this.history?.clear()
        this.input.focus()
      })
      sections.push(
        el('section', { class: 'finder__section', attrs: { 'aria-labelledby': 'recent-heading' } }, [
          el('header', { class: 'finder__section-head' }, [el('h2', { class: 'finder__section-title', text: 'Recently played', attrs: { id: 'recent-heading' } }), clear]),
          el('ul', { class: 'results results--recent' }, recent.map((entry) => this.renderResult(entry.song))),
        ]),
      )
    } else {
      sections.push(el('p', { class: 'finder__hint', text: 'Search the iTunes catalog by song, artist or album. Every song plays in full.' }))
    }
    sections.push(this.renderCharts())
    this.body.replaceChildren(...sections)
  }

  private renderCharts(): HTMLElement {
    const heading = el('h2', { class: 'finder__section-title', text: `Top charts · ${regionName(this.country)}`, attrs: { id: 'charts-heading' } })
    const head = el('header', { class: 'finder__section-head' }, [heading])
    const section = el('section', { class: 'finder__section finder__charts', attrs: { 'aria-labelledby': 'charts-heading' } }, [head])
    const charts = this.charts
    if (charts === null || charts === 'loading') {
      section.setAttribute('aria-busy', 'true')
      section.append(el('ul', { class: 'results' }, Array.from({ length: 4 }, () =>
        el('li', { class: 'result result--skeleton', attrs: { 'aria-hidden': 'true' } }, [
          el('span', { class: 'skeleton skeleton--cover' }),
          el('span', { class: 'result__meta' }, [el('span', { class: 'skeleton skeleton--line' }), el('span', { class: 'skeleton skeleton--line skeleton--short' })]),
        ]),
      )))
      return section
    }
    if (charts === 'error') {
      const retry = el('button', { class: 'button button--quiet button--small', text: 'Try again', attrs: { type: 'button' } })
      retry.addEventListener('click', () => void this.loadCharts(true))
      section.append(el('div', { class: 'finder__note', attrs: { role: 'alert' } }, [el('p', { text: 'The charts could not be loaded.' }), retry]))
      return section
    }
    if (charts.length === 0) {
      section.append(el('p', { class: 'finder__note', text: 'No chart is available right now.' }))
      return section
    }
    const shown = this.chartsExpanded ? charts : charts.slice(0, CHARTS_PREVIEW)
    section.append(el('ol', { class: 'results results--charts' }, shown.map((song, index) => this.renderResult(song, index + 1))))
    if (charts.length > shown.length) {
      const more = el('button', { class: 'button button--quiet button--small finder__more', text: `Show all ${charts.length}`, attrs: { type: 'button' } })
      more.addEventListener('click', () => {
        this.chartsExpanded = true
        this.renderIdle()
        this.body.querySelectorAll<HTMLElement>('.results--charts .result')[CHARTS_PREVIEW]?.querySelector<HTMLButtonElement>('button')?.focus()
      })
      section.append(more)
    }
    return section
  }

  private async loadCharts(force = false): Promise<void> {
    if (!force && this.charts !== null) return
    this.charts = 'loading'
    if (this.idle && this.input.value.trim() === '') this.renderIdle()
    try {
      this.charts = await chartSongs(this.country)
    } catch {
      this.charts = 'error'
    }
    if (this.idle && this.input.value.trim() === '') this.renderIdle()
  }

  private renderMessage(title: string, text: string): void {
    this.idle = false
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('div', { class: 'empty' }, [
        el('p', { class: 'empty__title', text: title }),
        el('p', { class: 'empty__text', text }),
      ]),
    )
  }

  private renderError(term: string): void {
    this.idle = false
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
    this.idle = false
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
    this.idle = false
    this.body.setAttribute('aria-busy', 'false')
    this.body.replaceChildren(
      el('p', { class: 'results__count', text: `${songs.length} results` }),
      el('ul', { class: 'results' }, songs.map((song) => this.renderResult(song))),
    )
  }

  private renderResult(song: Song, rank?: number): HTMLElement {
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
    }, [icon('insert'), el('span', { text: 'At #' })])
    const playButton = el('button', {
      class: 'chip chip--play',
      attrs: { type: 'button', 'aria-label': `Play ${label} now without adding it`, title: 'Play now without adding it' },
    }, [icon('playSmall'), el('span', { text: 'Play' })])
    const nextButton = el('button', {
      class: 'chip',
      attrs: { type: 'button', 'aria-label': `Play ${label} next, right after the current song`, title: 'Play next, right after the current song' },
    }, [icon('next2'), el('span', { text: 'Next' })])
    const firstButton = el('button', {
      class: 'chip chip--icon',
      attrs: { type: 'button', 'aria-label': `Add ${label} at the start`, title: 'Add first' },
    }, [icon('toFirst')])
    const lastButton = el('button', {
      class: 'chip chip--icon',
      attrs: { type: 'button', 'aria-label': `Add ${label} at the end`, title: 'Add last' },
    }, [icon('toLast')])
    const item = el('li', { class: 'result' }, [
      rank === undefined ? null : el('span', { class: 'result__rank', text: String(rank), attrs: { 'aria-label': `Number ${rank}` } }),
      el('img', { class: 'result__cover', attrs: { src: song.artworkUrl.replace('600x600', '120x120'), alt: '', width: 48, height: 48, loading: 'lazy', decoding: 'async' } }),
      el('div', { class: 'result__meta' }, [
        el('p', { class: 'result__title', text: song.title }),
        el('p', { class: 'result__artist', text: `${song.artist} · ${formatTime(song.durationMs)}` }),
      ]),
      el('div', { class: 'result__actions' }, [playButton, nextButton, firstButton, lastButton, atButton]),
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
    playButton.addEventListener('click', () => void this.app.playNow(song))
    nextButton.addEventListener('click', () => void this.app.playNext(song))
    item.draggable = true
    item.title = 'Drag into the flight plan or the linked list'
    item.addEventListener('dragstart', (event) => {
      if (event.target instanceof HTMLElement && event.target.closest('input, button')) {
        event.preventDefault()
        return
      }
      item.classList.add('result--dragging')
      startSongDrag(event, song, item.querySelector('.result__cover'))
    })
    item.addEventListener('dragend', () => {
      item.classList.remove('result--dragging')
      endSongDrag()
    })
    firstButton.addEventListener('click', () => void this.app.addFirst(song))
    lastButton.addEventListener('click', () => void this.app.addLast(song))
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
