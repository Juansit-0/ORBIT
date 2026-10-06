import { el } from './dom.ts'
import { icon, type IconName } from './icons.ts'

export interface SheetAction {
  label: string
  glyph: IconName
  danger?: boolean
  disabled?: boolean
  run: () => void
}

export class ActionSheet {
  readonly dialog: HTMLDialogElement
  private readonly heading: HTMLElement
  private readonly sub: HTMLElement
  private readonly list: HTMLElement

  constructor() {
    this.heading = el('p', { class: 'sheet__title' })
    this.sub = el('p', { class: 'sheet__sub' })
    this.list = el('div', { class: 'sheet__actions' })
    this.dialog = el('dialog', { class: 'sheet', attrs: { 'aria-label': 'Song actions' } }, [
      el('span', { class: 'sheet__grabber', attrs: { 'aria-hidden': 'true' } }),
      this.heading,
      this.sub,
      this.list,
    ])
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
  }

  open(title: string, subtitle: string, actions: SheetAction[]): void {
    this.heading.textContent = title
    this.sub.textContent = subtitle
    this.list.replaceChildren(
      ...actions.map((action) => {
        const button = el('button', {
          class: `sheet__action${action.danger ? ' sheet__action--danger' : ''}`,
          attrs: { type: 'button', disabled: action.disabled },
        }, [icon(action.glyph), el('span', { text: action.label })])
        button.addEventListener('click', () => {
          this.dialog.close()
          action.run()
        })
        return button
      }),
    )
    if (!this.dialog.open) this.dialog.showModal()
    this.list.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }
}
