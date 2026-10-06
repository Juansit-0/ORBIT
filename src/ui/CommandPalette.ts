import type { PlayerApp } from '../app/PlayerApp.ts'
import type { Song } from '../core/types.ts'
import { searchSongs } from '../services/searchService.ts'
import { groupTogether, rankCommands } from './commandRank.ts'
import { el, setText } from './dom.ts'
import { icon, type IconName } from './icons.ts'

interface Command {
  id: string
  label: string
  keywords?: string
  hint?: string
  glyph: IconName
  group: 'Actions' | 'Flight plan' | 'Search'
  cover?: string
  run: (event: KeyboardEvent | MouseEvent | null) => void
}

export interface PaletteActions {
  toggleCinema: () => void
  toggleLyrics: () => void
  setSleep: (minutes: number | 'end' | null) => void
  focusSearch: () => void
  toggleList: () => void
  listShown: () => boolean
}

export class CommandPalette {
  readonly dialog: HTMLDialogElement
  private readonly app: PlayerApp
  private readonly actions: PaletteActions
  private readonly input: HTMLInputElement
  private readonly list: HTMLElement
  private readonly status: HTMLElement
  private items: Command[] = []
  private active = 0
  private searchTimer: number | undefined
  private searchAbort: AbortController | null = null
  private remote: Song[] = []
  private remoteFor = ''

  constructor(app: PlayerApp, actions: PaletteActions) {
    this.app = app
    this.actions = actions
    this.input = el('input', {
      class: 'palette__input',
      attrs: {
        type: 'text',
        placeholder: 'Type a command, a song in your plan, or search the catalog',
        'aria-label': 'Command',
        role: 'combobox',
        'aria-expanded': 'true',
        'aria-controls': 'palette-list',
        autocomplete: 'off',
        spellcheck: 'false',
      },
    })
    this.list = el('ul', { class: 'palette__list', attrs: { id: 'palette-list', role: 'listbox', 'aria-label': 'Results' } })
    this.status = el('p', { class: 'palette__status', attrs: { 'aria-live': 'polite' } })
    this.dialog = el('dialog', { class: 'palette', attrs: { 'aria-label': 'Command palette' } }, [
      el('div', { class: 'palette__field' }, [icon('search', 'icon palette__icon'), this.input, el('kbd', { text: 'Esc' })]),
      this.list,
      el('footer', { class: 'palette__footer' }, [
        this.status,
        el('p', { class: 'palette__keys' }, [el('kbd', { text: '↑↓' }), ' move  ', el('kbd', { text: 'Enter' }), ' run  ', el('kbd', { text: 'Shift' }), '+', el('kbd', { text: 'Enter' }), ' add to plan']),
      ]),
    ])
    this.input.addEventListener('input', () => {
      this.active = 0
      this.render()
      this.scheduleSearch()
    })
    this.input.addEventListener('keydown', (event) => this.onKey(event))
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.close()
    })
    this.dialog.addEventListener('close', () => {
      this.searchAbort?.abort()
    })
  }

  open(): void {
    if (this.dialog.open) return
    this.input.value = ''
    this.remote = []
    this.remoteFor = ''
    this.active = 0
    this.render()
    this.dialog.showModal()
    this.input.focus()
  }

  close(): void {
    if (this.dialog.open) this.dialog.close()
  }

  toggle(): void {
    if (this.dialog.open) this.close()
    else this.open()
  }

  private commands(): Command[] {
    const app = this.app
    const playlist = app.playlist
    const playing = app.playback.isPlaying
    const list: Command[] = [
      { id: 'play', label: playing ? 'Pause' : 'Play', keywords: 'resume stop', glyph: playing ? 'pause' : 'play', group: 'Actions', hint: 'Space', run: () => void app.togglePlay() },
      { id: 'next', label: 'Next song', keywords: 'skip forward', glyph: 'next', group: 'Actions', hint: '→', run: () => void app.next() },
      { id: 'previous', label: 'Previous song', keywords: 'back', glyph: 'previous', group: 'Actions', hint: '←', run: () => void app.previous() },
      { id: 'shuffle', label: playlist.shuffle ? 'Shuffle off' : 'Shuffle on', keywords: 'random', glyph: 'shuffle', group: 'Actions', hint: 'S', run: () => app.toggleShuffle() },
      { id: 'repeat', label: 'Change repeat mode', keywords: `loop repeat ${playlist.repeat}`, glyph: 'repeat', group: 'Actions', hint: 'R', run: () => app.cycleRepeat() },
      { id: 'undo', label: 'Undo', keywords: app.history.undoLabel ?? '', glyph: 'undo', group: 'Actions', hint: 'Ctrl Z', run: () => void app.undo() },
      { id: 'redo', label: 'Redo', keywords: app.history.redoLabel ?? '', glyph: 'redo', group: 'Actions', run: () => void app.redo() },
      { id: 'cinema', label: 'Player mode', keywords: 'cinema focus fullscreen planet', glyph: 'cinema', group: 'Actions', hint: 'O', run: () => this.actions.toggleCinema() },
      { id: 'list', label: this.actions.listShown() ? 'Hide linked list' : 'Show linked list', keywords: 'visualizer nodes pointers head tail explain', glyph: 'orbit', group: 'Actions', hint: 'V', run: () => this.actions.toggleList() },
      { id: 'lyrics', label: 'Show lyrics', keywords: 'karaoke words', glyph: 'lyrics', group: 'Actions', hint: 'L', run: () => this.actions.toggleLyrics() },
      { id: 'search', label: 'Search songs', keywords: 'find catalog', glyph: 'search', group: 'Actions', hint: '/', run: () => this.actions.focusSearch() },
      { id: 'sleep-15', label: 'Sleep timer 15 minutes', keywords: 'stop timer', glyph: 'moon', group: 'Actions', run: () => this.actions.setSleep(15) },
      { id: 'sleep-30', label: 'Sleep timer 30 minutes', keywords: 'stop timer', glyph: 'moon', group: 'Actions', run: () => this.actions.setSleep(30) },
      { id: 'sleep-60', label: 'Sleep timer 60 minutes', keywords: 'stop timer', glyph: 'moon', group: 'Actions', run: () => this.actions.setSleep(60) },
      { id: 'sleep-end', label: 'Sleep after this song', keywords: 'stop timer end', glyph: 'moon', group: 'Actions', run: () => this.actions.setSleep('end') },
      { id: 'sleep-off', label: 'Sleep timer off', keywords: 'cancel timer', glyph: 'moon', group: 'Actions', run: () => this.actions.setSleep(null) },
    ]
    for (const entry of app.library.list()) {
      if (entry.id === app.library.activeId) continue
      list.push({ id: `library-${entry.id}`, label: `Switch to ${entry.name}`, keywords: 'playlist library', glyph: 'orbit', group: 'Actions', run: () => app.switchPlaylist(entry.id) })
    }
    playlist.list.nodes().forEach((node, index) => {
      list.push({
        id: `node-${node.id}`,
        label: node.value.title,
        keywords: `${node.value.artist} ${node.value.album}`,
        hint: `#${index + 1}`,
        glyph: 'music',
        group: 'Flight plan',
        cover: node.value.artworkUrl,
        run: () => void app.play(node.id),
      })
    })
    return list
  }

  private render(): void {
    const query = this.input.value
    const ranked = rankCommands(query, this.commands(), query.trim() ? 8 : 9)
    const remote: Command[] = query.trim().length >= 2 && this.remoteFor === query.trim()
      ? this.remote.slice(0, 6).map((song) => ({
          id: `song-${song.id}`,
          label: song.title,
          keywords: song.artist,
          hint: 'Play now',
          glyph: 'playSmall',
          group: 'Search',
          cover: song.artworkUrl,
          run: (event) => {
            if (event && event.shiftKey) void this.app.addLast(song)
            else void this.app.playNow(song)
          },
        }))
      : []
    this.items = groupTogether([...ranked, ...remote], (item) => item.group)
    if (this.active >= this.items.length) this.active = Math.max(0, this.items.length - 1)
    let lastGroup = ''
    const nodes: HTMLElement[] = []
    this.items.forEach((item, index) => {
      if (item.group !== lastGroup) {
        lastGroup = item.group
        nodes.push(el('li', { class: 'palette__group', text: item.group, attrs: { role: 'presentation' } }))
      }
      const option = el('li', {
        class: 'palette__item',
        attrs: { role: 'option', id: `palette-${index}`, 'aria-selected': String(index === this.active) },
      }, [
        item.cover
          ? el('img', { class: 'palette__cover', attrs: { src: item.cover.replace('600x600', '120x120'), alt: '', width: 32, height: 32 } })
          : el('span', { class: 'palette__glyph' }, [icon(item.glyph)]),
        el('span', { class: 'palette__text' }, [
          el('span', { class: 'palette__label', text: item.label }),
          item.group !== 'Actions' && item.keywords ? el('span', { class: 'palette__sub', text: item.keywords.split(' ').slice(0, 6).join(' ') }) : null,
        ]),
        item.hint ? el('span', { class: 'palette__hint', text: item.hint }) : null,
      ])
      option.addEventListener('click', (event) => this.run(index, event))
      option.addEventListener('pointermove', () => {
        if (this.active !== index) {
          this.active = index
          this.highlight()
        }
      })
      nodes.push(option)
    })
    this.list.replaceChildren(...nodes)
    this.highlight()
    if (this.items.length === 0) setText(this.status, query.trim().length >= 2 ? 'Searching the catalog…' : 'No matches')
    else setText(this.status, `${this.items.length} results`)
  }

  private highlight(): void {
    for (const option of this.list.querySelectorAll<HTMLElement>('.palette__item')) {
      const selected = option.id === `palette-${this.active}`
      option.setAttribute('aria-selected', String(selected))
      if (selected) option.scrollIntoView({ block: 'nearest' })
    }
    this.input.setAttribute('aria-activedescendant', this.items.length ? `palette-${this.active}` : '')
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (this.items.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      this.active = (this.active + step + this.items.length) % this.items.length
      this.highlight()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      this.run(this.active, event)
    }
  }

  private run(index: number, event: KeyboardEvent | MouseEvent | null): void {
    const item = this.items[index]
    if (!item) return
    this.close()
    item.run(event)
  }

  private scheduleSearch(): void {
    window.clearTimeout(this.searchTimer)
    const term = this.input.value.trim()
    if (term.length < 2) return
    this.searchTimer = window.setTimeout(async () => {
      this.searchAbort?.abort()
      const abort = new AbortController()
      this.searchAbort = abort
      try {
        const songs = await searchSongs(term, abort.signal)
        if (abort.signal.aborted || this.input.value.trim() !== term) return
        this.remote = songs
        this.remoteFor = term
        this.render()
      } catch {
        if (!abort.signal.aborted) setText(this.status, 'The catalog could not be reached')
      }
    }, 300)
  }
}
