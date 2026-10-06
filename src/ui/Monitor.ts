import { el, setText } from './dom.ts'
import { icon } from './icons.ts'

export class Monitor {
  readonly root: HTMLElement
  readonly host: HTMLElement
  private readonly caption: HTMLElement

  constructor() {
    this.host = el('div', { class: 'monitor__video', attrs: { id: 'video-host' } })
    this.caption = el('span', { class: 'monitor__caption' })
    this.root = el('section', { class: 'monitor', attrs: { 'aria-label': 'Video', 'data-active': 'false' } }, [
      el('header', { class: 'monitor__head' }, [icon('music', 'icon monitor__icon'), this.caption]),
      this.host,
    ])
  }

  setActive(active: boolean, title: string): void {
    this.root.dataset.active = String(active)
    setText(this.caption, active ? `Playing from YouTube · ${title}` : '')
  }

  place(lens: DOMRect | null): void {
    if (!lens || lens.width === 0) {
      this.root.style.removeProperty('--mx')
      this.root.style.removeProperty('--my')
      return
    }
    this.root.style.setProperty('--mx', `${lens.left + lens.width / 2}px`)
    this.root.style.setProperty('--my', `${lens.top + lens.height / 2}px`)
  }
}
