import { el } from './dom.ts'

export type RailTab = 'search' | 'lyrics'

export class LeftRail {
  readonly root: HTMLElement
  private readonly tabs = new Map<RailTab, HTMLButtonElement>()
  private readonly panes = new Map<RailTab, HTMLElement>()
  private current: RailTab = 'search'
  private readonly listeners = new Set<(tab: RailTab) => void>()

  constructor(search: HTMLElement, lyrics: HTMLElement) {
    const list = el('div', { class: 'rail-tabs', attrs: { role: 'tablist', 'aria-label': 'Left panel' } })
    const entries: [RailTab, string, HTMLElement][] = [
      ['search', 'Search', search],
      ['lyrics', 'Lyrics', lyrics],
    ]
    for (const [tab, label, pane] of entries) {
      const button = el('button', {
        class: 'rail-tabs__tab',
        text: label,
        attrs: { type: 'button', role: 'tab', id: `tab-${tab}`, 'aria-controls': `pane-${tab}` },
      })
      pane.id = `pane-${tab}`
      pane.setAttribute('role', 'tabpanel')
      pane.setAttribute('aria-labelledby', `tab-${tab}`)
      button.addEventListener('click', () => this.show(tab))
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
        event.preventDefault()
        const next: RailTab = tab === 'search' ? 'lyrics' : 'search'
        this.show(next)
        this.tabs.get(next)?.focus()
      })
      this.tabs.set(tab, button)
      this.panes.set(tab, pane)
      list.append(button)
    }
    this.root = el('aside', { class: 'rail rail--search', attrs: { id: 'panel-search', 'aria-label': 'Search and lyrics' } }, [
      el('header', { class: 'rail__head' }, [list]),
      search,
      lyrics,
    ])
    this.show('search')
  }

  get tab(): RailTab {
    return this.current
  }

  onChange(listener: (tab: RailTab) => void): void {
    this.listeners.add(listener)
  }

  show(tab: RailTab): void {
    this.current = tab
    for (const [key, button] of this.tabs) {
      const selected = key === tab
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
      const pane = this.panes.get(key)
      if (pane) pane.hidden = !selected
    }
    this.root.dataset.tab = tab
    for (const listener of this.listeners) listener(tab)
  }
}
