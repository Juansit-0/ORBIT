import { el, setText } from './dom.ts'
import { icon } from './icons.ts'

export interface MoreItem {
  button: HTMLButtonElement
  label: string
  panel: HTMLElement
}

export class MoreMenu {
  readonly button: HTMLButtonElement
  readonly panel: HTMLElement
  private readonly badge: HTMLElement
  private readonly items: HTMLButtonElement[] = []

  constructor(entries: MoreItem[]) {
    this.badge = el('span', { class: 'more__badge', attrs: { hidden: true, 'aria-hidden': 'true' } })
    this.button = el('button', {
      class: 'icon-button more__button',
      attrs: { type: 'button', popovertarget: 'more-menu', 'aria-label': 'More', title: 'More', 'aria-haspopup': 'menu' },
    }, [icon('more'), this.badge])
    const list = el('div', { class: 'more__list', attrs: { role: 'menu', 'aria-label': 'More' } })
    for (const entry of entries) {
      const item = entry.button
      item.removeAttribute('popovertarget')
      item.classList.remove('icon-button')
      item.classList.add('more__item')
      item.setAttribute('role', 'menuitem')
      item.setAttribute('aria-haspopup', 'dialog')
      item.append(el('span', { class: 'more__label', text: entry.label }))
      item.addEventListener('click', () => {
        this.panel.hidePopover()
        entry.panel.showPopover()
      })
      this.items.push(item)
      list.append(item)
    }
    list.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
      event.preventDefault()
      const index = this.items.findIndex((item) => item === document.activeElement)
      const step = event.key === 'ArrowDown' ? 1 : -1
      this.items[(index + step + this.items.length) % this.items.length]?.focus()
    })
    this.panel = el('div', { class: 'more', attrs: { id: 'more-menu', popover: 'auto' } }, [list])
    this.panel.addEventListener('toggle', (event) => {
      if ((event as ToggleEvent).newState === 'open') this.items[0]?.focus()
    })
  }

  setBadge(text: string | null): void {
    this.badge.hidden = !text
    setText(this.badge, text ?? '')
  }
}
