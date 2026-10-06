import type { PlayerApp } from '../app/PlayerApp.ts'
import type { SongNode } from '../core/SongNode.ts'
import { enableDragReorder } from './dragReorder.ts'
import { el, setText, toggleAttr } from './dom.ts'
import { exitRow, FlipTracker, slideIn } from './motion.ts'
import { enableDropInsert } from './dropInsert.ts'
import { ActionSheet } from './ActionSheet.ts'
import { isLongPress } from './gestures.ts'
import { formatTime, plural } from './format.ts'
import { icon } from './icons.ts'

interface RowRefs {
  row: HTMLLIElement
  position: HTMLElement
  cover: HTMLImageElement
  title: HTMLElement
  artist: HTMLElement
  inlineTime: HTMLElement
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
  private readonly body: HTMLElement
  readonly sheet = new ActionSheet()
  private suppressClick = false
  private readonly flip = new FlipTracker('nodeId')
  private suppressFlip = false

  constructor(app: PlayerApp, library: HTMLElement) {
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
      el('div', { class: 'library-bar' }, [library]),
      el('div', { class: 'filter' }, [
        el('label', { class: 'visually-hidden', text: 'Filter the flight plan', attrs: { for: 'queue-filter' } }),
        icon('search', 'icon filter__icon'),
        this.filter,
      ]),
      (this.body = el('div', { class: 'rail__body queue-body' }, [this.list, this.noMatch, this.empty])),
    ])
    this.filter.addEventListener('input', () => this.applyFilter(true))
    enableDropInsert({
      zone: this.body,
      axis: 'y',
      items: () => [...this.list.querySelectorAll<HTMLElement>('.waypoint:not([data-exiting])')],
      onDrop: (index, song) => {
        const rows = [...this.list.querySelectorAll<HTMLElement>('.waypoint:not([data-exiting])')].filter((row) => !row.hidden)
        const target = rows[index]
        const position = target ? Number(target.dataset.position) : this.app.playlist.size + 1
        this.app.insertAt(position, song)
      },
    })
    enableDragReorder({
      list: this.list,
      handleSelector: '.waypoint__pos',
      itemSelector: '.waypoint',
      onDrop: (from, to) => {
        this.suppressFlip = true
        void this.app.move(from, to)
      },
    })
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
        this.rows.delete(id)
        exitRow(refs.row, () => refs.row.remove())
      }
    }
    const live = [...this.list.children].filter((child) => !(child as HTMLElement).dataset.exiting)
    nodes.forEach((node, index) => {
      const refs = this.rows.get(node.id) ?? this.createRow(node)
      this.updateRow(refs, node, index, nodes.length)
      const current = live[index]
      if (current !== refs.row) {
        this.list.insertBefore(refs.row, current ?? null)
        const previousIndex = live.indexOf(refs.row)
        if (previousIndex !== -1) live.splice(previousIndex, 1)
        live.splice(index, 0, refs.row)
      }
    })
    const total = nodes.reduce((sum, node) => sum + node.value.durationMs, 0)
    setText(this.summary, nodes.length === 0 ? 'No songs' : `${plural(nodes.length, 'song')} \u00b7 ${formatTime(total)}`)
    this.empty.hidden = nodes.length > 0
    this.list.hidden = nodes.length === 0
    this.renderCurrent()
    this.applyFilter(false)
    const rows = nodes.map((node) => this.rows.get(node.id)?.row).filter((row): row is HTMLLIElement => Boolean(row))
    if (this.suppressFlip) {
      this.suppressFlip = false
      this.flip.snapshot(rows)
    } else {
      this.flip.play(rows, slideIn)
    }
  }

  private renderCurrent(): void {
    const currentId = this.app.playlist.current?.id
    const playing = this.app.playback.isPlaying && this.app.playback.state.nodeId === currentId
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
      position: el('span', { class: 'waypoint__num' }),
      cover: el('img', { class: 'waypoint__cover', attrs: { alt: '', width: 40, height: 40, loading: 'lazy', decoding: 'async' } }),
      title: el('span', { class: 'waypoint__title' }),
      artist: el('span', { class: 'waypoint__artist' }),
      inlineTime: el('span', { class: 'waypoint__inline-time' }),
      time: el('span', { class: 'waypoint__time' }),
      status: el('span', { class: 'waypoint__status' }),
      main: el('button', { class: 'waypoint__main', attrs: { type: 'button' } }),
      up: el('button', { class: 'icon-button icon-button--small', attrs: { type: 'button' } }, [icon('up')]),
      down: el('button', { class: 'icon-button icon-button--small', attrs: { type: 'button' } }, [icon('down')]),
      remove: el('button', { class: 'icon-button icon-button--small icon-button--danger waypoint__remove', attrs: { type: 'button' } }, [icon('trash')]),
    }
    refs.main.append(
      refs.cover,
      el('span', { class: 'waypoint__text' }, [
        refs.title,
        el('span', { class: 'waypoint__sub' }, [refs.artist, refs.inlineTime]),
        refs.status,
      ]),
    )
    refs.row.append(
      el('span', { class: 'waypoint__pos', attrs: { 'aria-hidden': 'true', title: 'Drag to reorder' } }, [
        refs.position,
        icon('grip', 'icon waypoint__grip'),
      ]),
      el('span', { class: 'waypoint__dot', attrs: { 'aria-hidden': 'true' } }),
      refs.main,
      el('span', { class: 'waypoint__end' }, [
        refs.time,
        el('span', { class: 'waypoint__moves' }, [refs.up, refs.down]),
      ]),
      refs.remove,
    )
    refs.main.addEventListener('click', (event) => {
      if (this.suppressClick) {
        event.preventDefault()
        this.suppressClick = false
        return
      }
      void this.app.play(node.id)
    })
    this.bindLongPress(refs.row, node.id)
    refs.up.addEventListener('click', () => void this.moveBy(node.id, -1))
    refs.down.addEventListener('click', () => void this.moveBy(node.id, 1))
    refs.remove.addEventListener('click', () => this.removeRow(node.id))
    refs.row.addEventListener('keydown', (event) => {
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        void this.moveBy(node.id, event.key === 'ArrowUp' ? -1 : 1)
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
    setText(refs.inlineTime, formatTime(song.durationMs))
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

  private bindLongPress(row: HTMLElement, nodeId: string): void {
    let press: { x: number; y: number; time: number; timer: number; moved: number } | null = null
    const cancel = () => {
      if (press) window.clearTimeout(press.timer)
      press = null
      row.removeAttribute('data-pressing')
    }
    row.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' || (event.target as Element).closest('.waypoint__end, .waypoint__remove, .waypoint__pos')) return
      const state = { x: event.clientX, y: event.clientY, time: performance.now(), moved: 0, timer: 0 }
      state.timer = window.setTimeout(() => {
        if (!press || !isLongPress(performance.now() - press.time, press.moved)) return
        cancel()
        this.suppressClick = true
        navigator.vibrate?.(12)
        this.openSheet(nodeId)
      }, 500)
      press = state
      row.dataset.pressing = 'true'
    })
    row.addEventListener('pointermove', (event) => {
      if (!press) return
      press.moved = Math.max(press.moved, Math.hypot(event.clientX - press.x, event.clientY - press.y))
      if (press.moved >= 10) cancel()
    })
    row.addEventListener('pointerup', cancel)
    row.addEventListener('pointercancel', cancel)
    row.addEventListener('contextmenu', (event) => {
      if (window.matchMedia('(pointer: coarse)').matches) event.preventDefault()
    })
  }

  private openSheet(nodeId: string): void {
    const node = this.app.playlist.list.findById(nodeId)
    if (!node) return
    const index = this.app.playlist.list.indexOf(node)
    const size = this.app.playlist.size
    this.sheet.open(node.value.title, `${node.value.artist} \u00b7 position ${index + 1} of ${size}`, [
      { label: 'Play', glyph: 'playSmall', run: () => void this.app.play(nodeId) },
      { label: 'Play next', glyph: 'next2', disabled: node === this.app.playlist.current, run: () => void this.app.moveAfterCurrent(nodeId) },
      { label: 'Move up', glyph: 'up', disabled: index === 0, run: () => void this.moveBy(nodeId, -1) },
      { label: 'Move down', glyph: 'down', disabled: index === size - 1, run: () => void this.moveBy(nodeId, 1) },
      { label: 'Remove', glyph: 'trash', danger: true, run: () => this.removeRow(nodeId) },
    ])
  }

  private async moveBy(nodeId: string, delta: number): Promise<void> {
    const index = this.app.playlist.list.indexOfId(nodeId)
    if (index === -1) return
    await this.app.move(index, index + delta)
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

  private applyFilter(snapshot: boolean): void {
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
    if (snapshot) this.flip.snapshot([...this.rows.values()].map((refs) => refs.row))
  }
}
