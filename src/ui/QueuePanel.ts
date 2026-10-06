import type { PlayerApp } from '../app/PlayerApp.ts'
import type { SongNode } from '../core/SongNode.ts'
import { el, setText, toggleAttr } from './dom.ts'
import { formatTime, plural } from './format.ts'
import { icon } from './icons.ts'

interface RowRefs {
  row: HTMLLIElement
  position: HTMLElement
  cover: HTMLImageElement
  title: HTMLElement
  artist: HTMLElement
  time: HTMLElement
  status: HTMLElement
  main: HTMLButtonElement
  up: HTMLButtonElement
  down: HTMLButtonElement
  remove: HTMLButtonElement
}

export class QueuePanel {
  readonly root: HTMLElement
  readonly list: HTMLOListElement
  private readonly app: PlayerApp
  private readonly summary: HTMLElement
  private readonly filter: HTMLInputElement
  private readonly empty: HTMLElement
  private readonly noMatch: HTMLElement
  private readonly rows = new Map<string, RowRefs>()

  constructor(app: PlayerApp) {
    this.app = app
    this.summary = el('p', { class: 'rail__meta' })
    this.filter = el('input', {
      class: 'filter__input',
      attrs: { id: 'queue-filter', type: 'search', placeholder: 'Filter the flight plan', autocomplete: 'off' },
    })
    this.list = el('ol', { class: 'queue', attrs: { 'aria-label': 'Songs in play order' } })
    this.empty = el('div', { class: 'empty' }, [
      icon('orbit', 'icon empty__icon'),
      el('p', { class: 'empty__title', text: 'The flight plan is empty' }),
      el('p', { class: 'empty__text', text: 'Search for a song and add it first, last or at an exact position.' }),
    ])
    this.noMatch = el('p', { class: 'queue__no-match', text: 'No songs in the flight plan match this filter.', attrs: { hidden: true } })
    this.root = el('aside', { class: 'rail rail--queue', attrs: { id: 'panel-queue', 'aria-labelledby': 'queue-heading' } }, [
      el('header', { class: 'rail__head' }, [
        el('h2', { class: 'rail__title', text: 'Flight plan', attrs: { id: 'queue-heading' } }),
        this.summary,
      ]),
      el('div', { class: 'filter' }, [
        el('label', { class: 'visually-hidden', text: 'Filter the flight plan', attrs: { for: 'queue-filter' } }),
        icon('search', 'icon filter__icon'),
        this.filter,
      ]),
      el('div', { class: 'rail__body' }, [this.list, this.noMatch, this.empty]),
    ])
    this.filter.addEventListener('input', () => this.applyFilter())
    app.playlist.subscribe(() => this.render())
    app.playback.subscribe(() => this.renderCurrent())
    this.render()
  }

  focusFilter(): void {
    this.filter.focus()
  }

  rowFor(nodeId: string): HTMLLIElement | undefined {
    return this.rows.get(nodeId)?.row
  }

  private render(): void {
    const nodes = this.app.playlist.list.nodes()
    const alive = new Set(nodes.map((node) => node.id))
    for (const [id, refs] of this.rows) {
      if (!alive.has(id)) {
        refs.row.remove()
        this.rows.delete(id)
      }
    }
    nodes.forEach((node, index) => {
      const refs = this.rows.get(node.id) ?? this.createRow(node)
      this.updateRow(refs, node, index, nodes.length)
      const expected = this.list.children[index]
      if (expected !== refs.row) this.list.insertBefore(refs.row, expected ?? null)
    })
    const total = nodes.reduce((sum, node) => sum + node.value.durationMs, 0)
    setText(this.summary, nodes.length === 0 ? 'No songs' : `${plural(nodes.length, 'song')} · ${formatTime(total)}`)
    this.empty.hidden = nodes.length > 0
    this.list.hidden = nodes.length === 0
    this.renderCurrent()
    this.applyFilter()
  }

  private renderCurrent(): void {
    const currentId = this.app.playlist.current?.id
    const playing = this.app.playback.isPlaying
    for (const [id, refs] of this.rows) {
      const isCurrent = id === currentId
      if (isCurrent) refs.row.setAttribute('aria-current', 'true')
      else refs.row.removeAttribute('aria-current')
      refs.row.dataset.playing = String(isCurrent && playing)
    }
  }

  private createRow(node: SongNode): RowRefs {
    const refs: RowRefs = {
      row: el('li', { class: 'waypoint', attrs: { 'data-node-id': node.id } }),
      position: el('span', { class: 'waypoint__pos', attrs: { 'aria-hidden': 'true' } }),
      cover: el('img', { class: 'waypoint__cover', attrs: { alt: '', width: 40, height: 40, loading: 'lazy', decoding: 'async' } }),
      title: el('span', { class: 'waypoint__title' }),
      artist: el('span', { class: 'waypoint__artist' }),
      time: el('span', { class: 'waypoint__time' }),
      status: el('span', { class: 'waypoint__status' }),
      main: el('button', { class: 'waypoint__main', attrs: { type: 'button' } }),
      up: el('button', { class: 'icon-button icon-button--small', attrs: { type: 'button' } }, [icon('up')]),
      down: el('button', { class: 'icon-button icon-button--small', attrs: { type: 'button' } }, [icon('down')]),
      remove: el('button', { class: 'icon-button icon-button--small icon-button--danger waypoint__remove', attrs: { type: 'button' } }, [icon('trash')]),
    }
    refs.main.append(refs.cover, el('span', { class: 'waypoint__text' }, [refs.title, refs.artist, refs.status]))
    refs.row.append(
      refs.position,
      refs.main,
      refs.time,
      el('span', { class: 'waypoint__actions' }, [refs.up, refs.down, refs.remove]),
    )
    refs.main.addEventListener('click', () => void this.app.play(node.id))
    refs.up.addEventListener('click', () => this.moveBy(node.id, -1))
    refs.down.addEventListener('click', () => this.moveBy(node.id, 1))
    refs.remove.addEventListener('click', () => this.removeRow(node.id))
    refs.row.addEventListener('keydown', (event) => {
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        this.moveBy(node.id, event.key === 'ArrowUp' ? -1 : 1)
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (event.target === refs.main) {
          event.preventDefault()
          this.removeRow(node.id)
        }
      }
    })
    this.rows.set(node.id, refs)
    return refs
  }

  private updateRow(refs: RowRefs, node: SongNode, index: number, size: number): void {
    const song = node.value
    const position = index + 1
    setText(refs.position, String(position).padStart(2, '0'))
    const art = song.artworkUrl.replace('600x600', '120x120')
    if (refs.cover.getAttribute('src') !== art) refs.cover.src = art
    setText(refs.title, song.title)
    setText(refs.artist, song.artist)
    setText(refs.time, formatTime(song.durationMs))
    setText(refs.status, song.unavailable ? 'Unavailable' : '')
    refs.status.hidden = !song.unavailable
    refs.row.dataset.unavailable = String(Boolean(song.unavailable))
    refs.row.dataset.position = String(position)
    refs.main.setAttribute('aria-label', `Play ${song.title} by ${song.artist}, position ${position} of ${size}`)
    refs.up.setAttribute('aria-label', `Move ${song.title} up`)
    refs.down.setAttribute('aria-label', `Move ${song.title} down`)
    refs.remove.setAttribute('aria-label', `Remove ${song.title}`)
    toggleAttr(refs.up, 'disabled', index === 0)
    toggleAttr(refs.down, 'disabled', index === size - 1)
  }

  private moveBy(nodeId: string, delta: number): void {
    const index = this.app.playlist.list.indexOfId(nodeId)
    if (index === -1) return
    this.app.move(index, index + delta)
    const refs = this.rows.get(nodeId)
    const target = delta < 0 ? refs?.up : refs?.down
    if (target && !target.disabled) target.focus()
    else refs?.main.focus()
  }

  private removeRow(nodeId: string): void {
    const order = this.app.playlist.list.nodes()
    const index = order.findIndex((node) => node.id === nodeId)
    const neighbor = order[index + 1] ?? order[index - 1]
    void this.app.remove(nodeId).then(() => {
      const next = neighbor ? this.rows.get(neighbor.id)?.main : null
      if (next) next.focus()
      else this.filter.focus()
    })
  }

  private applyFilter(): void {
    const query = this.filter.value.trim().toLowerCase()
    let visible = 0
    for (const node of this.app.playlist.list.nodes()) {
      const refs = this.rows.get(node.id)
      if (!refs) continue
      const match =
        query === '' ||
        node.value.title.toLowerCase().includes(query) ||
        node.value.artist.toLowerCase().includes(query) ||
        node.value.album.toLowerCase().includes(query)
      refs.row.hidden = !match
      if (match) visible += 1
    }
    this.noMatch.hidden = query === '' || visible > 0 || this.app.playlist.isEmpty()
  }
}
