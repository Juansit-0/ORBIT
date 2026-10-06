import type { PlayerApp } from '../app/PlayerApp.ts'
import { el, setText } from './dom.ts'
import { formatTime, plural } from './format.ts'
import { icon } from './icons.ts'

export class Masthead {
  readonly root: HTMLElement
  readonly actions: HTMLElement
  private readonly plan: HTMLElement

  constructor(app: PlayerApp) {
    this.plan = el('p', { class: 'mast__plan' })
    this.actions = el('div', { class: 'mast__actions' })
    this.root = el('header', { class: 'mast' }, [
      el('p', { class: 'brand' }, [icon('orbit', 'icon brand__mark'), el('span', { class: 'brand__name', text: 'Orbit' })]),
      this.plan,
      this.actions,
    ])
    const render = () => {
      const nodes = app.playlist.list.nodes()
      const total = nodes.reduce((sum, node) => sum + node.value.durationMs, 0)
      setText(this.plan, nodes.length === 0 ? 'No waypoints yet' : `${plural(nodes.length, 'waypoint')} · ${formatTime(total)} flight time`)
    }
    app.playlist.subscribe(render)
    render()
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
