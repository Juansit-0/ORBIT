import { el } from './dom.ts'
import { icon } from './icons.ts'

export interface SettingsOptions {
  vinyl: boolean
  onVinyl: (enabled: boolean) => void
}

export class SettingsMenu {
  readonly button: HTMLButtonElement
  readonly panel: HTMLElement

  constructor(options: SettingsOptions) {
    this.button = el('button', {
      class: 'icon-button',
      attrs: { type: 'button', popovertarget: 'settings', 'aria-label': 'Settings', title: 'Settings' },
    }, [icon('settings')])
    const vinyl = el('input', { class: 'switch__input', attrs: { type: 'checkbox', role: 'switch', id: 'setting-vinyl' } })
    vinyl.checked = options.vinyl
    vinyl.addEventListener('change', () => options.onVinyl(vinyl.checked))
    this.panel = el('div', { class: 'settings', attrs: { id: 'settings', popover: 'auto', role: 'dialog', 'aria-labelledby': 'settings-title' } }, [
      el('p', { class: 'settings__title', text: 'Settings', attrs: { id: 'settings-title' } }),
      el('label', { class: 'switch', attrs: { for: 'setting-vinyl' } }, [
        el('span', { class: 'switch__text' }, [
          el('span', { class: 'switch__label', text: 'Spin the cover like a vinyl' }),
          el('span', { class: 'switch__hint', text: 'The cover turns into a spinning record while music plays, and its particles spin with it.' }),
        ]),
        vinyl,
        el('span', { class: 'switch__track', attrs: { 'aria-hidden': 'true' } }),
      ]),
    ])
  }
}
