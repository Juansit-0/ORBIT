import { el } from './dom.ts'
import { icon } from './icons.ts'

export interface SettingsOptions {
  vinyl: boolean
  onVinyl: (enabled: boolean) => void
  cinemaDelay: number | null
  onCinemaDelay: (delay: number | null) => void
  cinemaFullscreen: boolean
  onCinemaFullscreen: (enabled: boolean) => void
  explain: boolean
  onExplain: (enabled: boolean) => void
  showList: boolean
  onShowList: (enabled: boolean) => void
  radio: boolean
  onRadio: (enabled: boolean) => void
  smoothVolume: boolean
  onSmoothVolume: (enabled: boolean) => void
}

const DELAYS: { label: string; value: number | null }[] = [
  { label: '10 s', value: 10000 },
  { label: '20 s', value: 20000 },
  { label: '45 s', value: 45000 },
  { label: 'Never', value: null },
]

function toggle(id: string, label: string, hint: string, checked: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
  const input = el('input', { class: 'switch__input', attrs: { type: 'checkbox', role: 'switch', id } })
  input.checked = checked
  input.addEventListener('change', () => onChange(input.checked))
  return el('label', { class: 'switch', attrs: { for: id } }, [
    el('span', { class: 'switch__text' }, [el('span', { class: 'switch__label', text: label }), el('span', { class: 'switch__hint', text: hint })]),
    input,
    el('span', { class: 'switch__track', attrs: { 'aria-hidden': 'true' } }),
  ])
}

export class SettingsMenu {
  readonly button: HTMLButtonElement
  readonly panel: HTMLElement
  private readonly listSwitch: HTMLInputElement
  private readonly nested: HTMLElement

  constructor(options: SettingsOptions) {
    this.button = el('button', {
      class: 'icon-button',
      attrs: { type: 'button', popovertarget: 'settings', 'aria-label': 'Settings', title: 'Settings' },
    }, [icon('settings')])
    const delays = el('div', { class: 'segmented', attrs: { role: 'radiogroup', 'aria-labelledby': 'cinema-delay-label' } }, DELAYS.map((entry) => {
      const id = `cinema-delay-${entry.value ?? 'never'}`
      const input = el('input', { class: 'segmented__input', attrs: { type: 'radio', name: 'cinema-delay', id } })
      input.checked = entry.value === options.cinemaDelay
      input.addEventListener('change', () => {
        if (input.checked) options.onCinemaDelay(entry.value)
      })
      return el('label', { class: 'segmented__option', attrs: { for: id } }, [input, el('span', { text: entry.label })])
    }))
    this.panel = el('div', { class: 'settings', attrs: { id: 'settings', popover: 'auto', role: 'dialog', 'aria-labelledby': 'settings-title' } }, [
      el('p', { class: 'settings__title', text: 'Settings', attrs: { id: 'settings-title' } }),
      el('div', { class: 'settings__group' }, [
        el('p', { class: 'switch__label', text: 'Player mode after', attrs: { id: 'cinema-delay-label' } }),
        el('p', { class: 'switch__hint', text: 'While music plays and nothing is touched, everything fades except the planet and the player. Press O to enter it any time.' }),
        delays,
      ]),
      toggle('setting-fullscreen', 'Full screen in player mode', 'Applies when you enter player mode with O or the button.', options.cinemaFullscreen, options.onCinemaFullscreen),
      toggle('setting-vinyl', 'Spin the cover like a vinyl', 'The cover turns into a spinning record while music plays, and its particles spin with it.', options.vinyl, options.onVinyl),
      toggle('setting-smooth', 'Smooth volume transitions', 'Fade the music out and in when you pause, resume or change songs.', options.smoothVolume, options.onSmoothVolume),
      toggle('setting-radio', 'Offer radio at the end', 'When the flight plan ends, offer to keep playing similar songs without adding them.', options.radio, options.onRadio),
      (this.nested = el('div', { class: 'settings__list' }, [
        toggle('setting-list', 'Show linked list', 'The panel under the player with HEAD, TAIL, every node and its next and prev pointers. Press V any time.', options.showList, (value) => {
          this.syncList(value)
          options.onShowList(value)
        }),
        el('div', { class: 'settings__nested' }, [
          toggle('setting-explain', 'Explain list operations', 'Plays each pointer change step by step in the linked list panel when you add, remove or move a song.', options.explain, options.onExplain),
        ]),
      ])),
    ])
    this.listSwitch = this.panel.querySelector<HTMLInputElement>('#setting-list') as HTMLInputElement
    this.syncList(options.showList)
  }

  setShowList(value: boolean): void {
    this.listSwitch.checked = value
    this.syncList(value)
  }

  private syncList(value: boolean): void {
    const nested = this.nested.querySelector<HTMLElement>('.settings__nested')
    if (nested) nested.hidden = !value
  }
}
