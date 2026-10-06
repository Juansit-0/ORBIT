import type { SleepMode, SleepTimer } from '../player/SleepTimer.ts'
import { showToast } from './components/toast.ts'
import { el, setText } from './dom.ts'
import { icon } from './icons.ts'

const OPTIONS: { label: string; mode: SleepMode }[] = [
  { label: 'Off', mode: { kind: 'off' } },
  { label: '15 minutes', mode: { kind: 'minutes', minutes: 15 } },
  { label: '30 minutes', mode: { kind: 'minutes', minutes: 30 } },
  { label: '60 minutes', mode: { kind: 'minutes', minutes: 60 } },
  { label: 'End of this song', mode: { kind: 'end-of-song' } },
]

function sameMode(a: SleepMode, b: SleepMode): boolean {
  if (a.kind !== b.kind) return false
  return a.kind !== 'minutes' || (b.kind === 'minutes' && a.minutes === b.minutes)
}

function remainingLabel(ms: number): string {
  const minutes = Math.ceil(ms / 60000)
  if (ms > 60000) return `${minutes}m`
  return `${Math.ceil(ms / 1000)}s`
}

export class SleepMenu {
  readonly button: HTMLButtonElement
  readonly panel: HTMLElement
  private readonly badge: HTMLElement
  private readonly items: { button: HTMLButtonElement; mode: SleepMode }[] = []

  constructor(timer: SleepTimer) {
    this.badge = el('span', { class: 'sleep__badge', attrs: { hidden: true } })
    this.button = el('button', {
      class: 'icon-button sleep__button',
      attrs: { type: 'button', popovertarget: 'sleep-menu', 'aria-label': 'Sleep timer', title: 'Sleep timer' },
    }, [icon('moon'), this.badge])
    const list = el('div', { class: 'sleep__list', attrs: { role: 'menu', 'aria-label': 'Stop playing after' } })
    for (const option of OPTIONS) {
      const item = el('button', {
        class: 'sleep__item',
        attrs: { type: 'button', role: 'menuitemradio', 'aria-checked': 'false' },
      }, [el('span', { class: 'sleep__check', attrs: { 'aria-hidden': 'true' } }), el('span', { text: option.label })])
      item.addEventListener('click', () => {
        timer.set(option.mode)
        this.panel.hidePopover()
        this.button.focus()
        showToast({
          tone: 'info',
          title: option.mode.kind === 'off' ? 'Sleep timer off' : `Sleep timer: ${option.label.toLowerCase()}`,
          detail: option.mode.kind === 'minutes' ? 'Music fades out and pauses when it runs out.' : option.mode.kind === 'end-of-song' ? 'Playback pauses when this song ends.' : undefined,
        })
      })
      this.items.push({ button: item, mode: option.mode })
      list.append(item)
    }
    list.addEventListener('keydown', (event) => {
      const index = this.items.findIndex((entry) => entry.button === document.activeElement)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        this.items[(index + step + this.items.length) % this.items.length]?.button.focus()
      }
    })
    this.panel = el('div', { class: 'sleep', attrs: { id: 'sleep-menu', popover: 'auto' } }, [
      el('p', { class: 'sleep__title', text: 'Stop playing after' }),
      list,
    ])
    this.panel.addEventListener('toggle', (event) => {
      if ((event as ToggleEvent).newState === 'open') {
        const checked = this.items.find((entry) => entry.button.getAttribute('aria-checked') === 'true')
        ;(checked ?? this.items[0])?.button.focus()
      }
    })
    timer.subscribe(() => this.render(timer))
    this.render(timer)
  }

  get badgeText(): string | null {
    return this.badge.hidden ? null : this.badge.textContent
  }

  private render(timer: SleepTimer): void {
    const mode = timer.mode
    for (const entry of this.items) entry.button.setAttribute('aria-checked', String(sameMode(entry.mode, mode)))
    const active = mode.kind !== 'off'
    this.button.setAttribute('aria-pressed', String(active))
    this.badge.hidden = !active
    const text = mode.kind === 'minutes' ? remainingLabel(timer.remainingMs) : mode.kind === 'end-of-song' ? 'end' : ''
    setText(this.badge, text)
    const label = mode.kind === 'minutes' ? `Sleep timer, ${remainingLabel(timer.remainingMs)} left` : mode.kind === 'end-of-song' ? 'Sleep timer, end of song' : 'Sleep timer'
    this.button.setAttribute('aria-label', label)
    this.button.title = label
  }
}
