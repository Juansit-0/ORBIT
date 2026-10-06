import { el } from './dom.ts'

export type View = 'search' | 'now' | 'queue'

const TABS: { view: View; label: string; panel: string }[] = [
  { view: 'search', label: 'Search', panel: 'panel-search' },
  { view: 'now', label: 'Now', panel: 'panel-now' },
  { view: 'queue', label: 'Flight plan', panel: 'panel-queue' },
]

export class MobileTabs {
  readonly root: HTMLElement
  private readonly shell: HTMLElement
  private readonly buttons = new Map<View, HTMLButtonElement>()

  constructor(shell: HTMLElement) {
    this.shell = shell
    this.root = el('nav', { class: 'tabs', attrs: { 'aria-label': 'Sections' } })
    for (const tab of TABS) {
      const button = el('button', {
        class: 'tabs__button',
        text: tab.label,
        attrs: { type: 'button', 'aria-controls': tab.panel },
      })
      button.addEventListener('click', () => this.show(tab.view))
      this.buttons.set(tab.view, button)
      this.root.append(button)
    }
    this.show('now')
  }

  show(view: View): void {
    this.shell.dataset.view = view
    window.dispatchEvent(new Event('resize'))
    for (const [key, button] of this.buttons) button.setAttribute('aria-pressed', String(key === view))
  }
}
