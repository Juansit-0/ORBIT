import type { PlayerApp } from '../app/PlayerApp.ts'
import { el } from './dom.ts'
import { icon } from './icons.ts'

export interface ShortcutTargets {
  focusSearch: () => void
  focusFilter: () => void
  toggleLyrics: () => void
  toggleCinema: () => void
}

export const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['Space'], action: 'Play or pause' },
  { keys: ['→'], action: 'Next song' },
  { keys: ['←'], action: 'Previous song' },
  { keys: ['Shift', '→'], action: 'Forward 10 seconds' },
  { keys: ['Shift', '←'], action: 'Back 10 seconds' },
  { keys: ['S'], action: 'Toggle shuffle' },
  { keys: ['R'], action: 'Cycle repeat' },
  { keys: ['M'], action: 'Mute or unmute' },
  { keys: ['L'], action: 'Show lyrics' },
  { keys: ['O'], action: 'Player mode' },
  { keys: ['/'], action: 'Search songs' },
  { keys: ['F'], action: 'Filter the flight plan' },
  { keys: ['Ctrl', 'Z'], action: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], action: 'Redo' },
  { keys: ['Alt', '↑ ↓'], action: 'Move the focused song' },
  { keys: ['Delete'], action: 'Remove the focused song' },
  { keys: ['?'], action: 'Show shortcuts' },
]

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLInputElement) return !['range', 'checkbox', 'radio', 'button'].includes(target.type)
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

export function createShortcutHelp(): { button: HTMLButtonElement; panel: HTMLElement } {
  const panel = el('div', { class: 'shortcuts', attrs: { id: 'shortcuts', popover: 'auto', role: 'dialog', 'aria-labelledby': 'shortcuts-title' } }, [
    el('h2', { class: 'shortcuts__title', text: 'Keyboard shortcuts', attrs: { id: 'shortcuts-title' } }),
    el(
      'dl',
      { class: 'shortcuts__list' },
      SHORTCUTS.flatMap((shortcut) => [
        el('dt', {}, shortcut.keys.map((key) => el('kbd', { text: key }))),
        el('dd', { text: shortcut.action }),
      ]),
    ),
  ])
  const button = el('button', {
    class: 'icon-button',
    attrs: { type: 'button', popovertarget: 'shortcuts', 'aria-label': 'Keyboard shortcuts', title: 'Keyboard shortcuts' },
  }, [icon('keyboard')])
  return { button, panel }
}

export function bindShortcuts(app: PlayerApp, targets: ShortcutTargets, help: HTMLElement): () => void {
  let lastVolume = 80
  const handler = (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (event.metaKey || event.ctrlKey) {
      const key = event.key.toLowerCase()
      if ((key === 'z' || key === 'y') && !isTyping(event.target)) {
        event.preventDefault()
        void (key === 'y' || event.shiftKey ? app.redo() : app.undo())
      }
      return
    }
    if (isTyping(event.target)) {
      if (event.key === 'Escape' && event.target instanceof HTMLInputElement) event.target.blur()
      return
    }
    const onControl = event.target instanceof HTMLButtonElement || event.target instanceof HTMLInputElement
    const key = event.key
    if (key === ' ' || key === 'k') {
      if (onControl && key === ' ') return
      event.preventDefault()
      void app.togglePlay()
    } else if (key === 'ArrowRight' || key === 'ArrowLeft') {
      if (event.altKey || (event.target instanceof HTMLInputElement && event.target.type === 'range')) return
      event.preventDefault()
      const forward = key === 'ArrowRight'
      if (event.shiftKey) app.playback.seekBy(forward ? 10000 : -10000)
      else void (forward ? app.next() : app.previous())
    } else if (key === 's' || key === 'S') {
      app.toggleShuffle()
    } else if (key === 'r' || key === 'R') {
      app.cycleRepeat()
    } else if (key === 'm' || key === 'M') {
      const volume = app.playback.state.volume
      if (volume > 0) {
        lastVolume = volume
        app.playback.setVolume(0)
      } else app.playback.setVolume(lastVolume || 80)
    } else if (key === 'o' || key === 'O') {
      targets.toggleCinema()
    } else if (key === 'l' || key === 'L') {
      targets.toggleLyrics()
    } else if (key === '/') {
      event.preventDefault()
      targets.focusSearch()
    } else if (key === 'f' || key === 'F') {
      event.preventDefault()
      targets.focusFilter()
    } else if (key === '?') {
      event.preventDefault()
      help.togglePopover()
    }
  }
  document.addEventListener('keydown', handler)
  return () => document.removeEventListener('keydown', handler)
}
