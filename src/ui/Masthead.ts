import type { PlayerApp } from '../app/PlayerApp.ts'
import { el } from './dom.ts'
import { icon } from './icons.ts'

export class Masthead {
  readonly root: HTMLElement
  readonly actions: HTMLElement

  constructor(app: PlayerApp) {
    this.actions = el('div', { class: 'mast__actions' })
    this.root = el('header', { class: 'mast' }, [
      el('p', { class: 'brand' }, [icon('orbit', 'icon brand__mark'), el('span', { class: 'brand__name', text: 'Orbit' })]),
      this.actions,
    ])
    const undo = el('button', { class: 'icon-button', attrs: { type: 'button', 'aria-label': 'Undo' } }, [icon('undo')])
    const redo = el('button', { class: 'icon-button', attrs: { type: 'button', 'aria-label': 'Redo' } }, [icon('redo')])
    undo.addEventListener('click', () => void app.undo())
    redo.addEventListener('click', () => void app.redo())
    const sync = () => {
      undo.disabled = !app.history.canUndo
      redo.disabled = !app.history.canRedo
      undo.title = app.history.undoLabel ? `Undo ${app.history.undoLabel}` : 'Nothing to undo'
      redo.title = app.history.redoLabel ? `Redo ${app.history.redoLabel}` : 'Nothing to redo'
    }
    app.history.subscribe(sync)
    sync()
    this.actions.append(el('div', { class: 'mast__history' }, [undo, redo]))
  }
}
