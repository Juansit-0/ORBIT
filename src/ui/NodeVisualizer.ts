import type { PlayerApp } from '../app/PlayerApp.ts'
import type { SongNode } from '../core/SongNode.ts'
import { el, setText } from './dom.ts'
import { formatTime } from './format.ts'
import { drawLinks, FlipTracker, popIn, travel } from './motion.ts'
import type { PlaylistChange } from '../core/Playlist.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'
const MIN_GROW = 0.5
const MAX_GROW = 10

interface NodeRefs {
  item: HTMLLIElement
  button: HTMLButtonElement
  index: HTMLElement
  title: HTMLElement
  time: HTMLElement
}

function linkGlyph(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 18')
  svg.setAttribute('class', 'link__glyph')
  svg.setAttribute('aria-hidden', 'true')
  svg.innerHTML =
    '<path class="link__next" d="M2 5h19m-3-3 3 3-3 3"/><path class="link__prev" d="M22 13H3m3-3-3 3 3 3"/>'
  return svg
}

export function nodeGrow(durationMs: number): number {
  const minutes = Math.max(0, durationMs) / 60000
  return Math.round(Math.min(MAX_GROW, Math.max(MIN_GROW, minutes)) * 100) / 100
}

export class NodeVisualizer {
  readonly root: HTMLElement
  private readonly app: PlayerApp
  private readonly track: HTMLOListElement
  private readonly size: HTMLElement
  private readonly pointers: HTMLElement
  private readonly now: HTMLElement
  private readonly viewport: HTMLElement
  private readonly refs = new Map<string, NodeRefs>()
  private lastCurrent: string | null = null
  private readonly flip = new FlipTracker('nodeId')

  constructor(app: PlayerApp) {
    this.app = app
    this.size = el('span', { class: 'dock__size' })
    this.pointers = el('p', { class: 'dock__pointers' })
    this.now = el('p', { class: 'dock__now' })
    this.track = el('ol', { class: 'chain', attrs: { 'aria-label': 'Doubly linked list nodes from head to tail' } })
    this.root = el('section', { class: 'dock', attrs: { 'aria-labelledby': 'dock-heading' } }, [
      el('header', { class: 'dock__head' }, [
        el('h2', { class: 'dock__title', attrs: { id: 'dock-heading' } }, [el('span', { text: 'Linked list' }), this.size]),
        this.pointers,
        el('p', { class: 'dock__legend', attrs: { 'aria-hidden': 'true' } }, [
          el('span', { class: 'legend legend--next', text: 'next' }),
          el('span', { class: 'legend legend--prev', text: 'prev' }),
        ]),
      ]),
      (this.viewport = el('div', { class: 'dock__viewport' }, [this.track])),
      this.now,
    ])
    app.playlist.subscribe((change) => this.render(change))
    app.playback.subscribe(() => this.renderCurrent())
    this.render('restore')
  }

  private render(change: PlaylistChange): void {
    const nodes = this.app.playlist.list.nodes()
    const fragment: Node[] = [this.terminal('null', 'start')]
    const alive = new Set<string>()
    nodes.forEach((node, index) => {
      alive.add(node.id)
      const refs = this.refs.get(node.id) ?? this.create(node)
      this.update(refs, node, index, nodes.length)
      fragment.push(refs.item)
      if (index < nodes.length - 1) fragment.push(el('li', { class: 'link', attrs: { 'aria-hidden': 'true' } }, [linkGlyph()]))
    })
    fragment.push(this.terminal('null', 'end'))
    for (const id of [...this.refs.keys()]) if (!alive.has(id)) this.refs.delete(id)
    this.track.replaceChildren(...fragment)
    this.track.dataset.empty = String(nodes.length === 0)
    setText(this.size, `size ${nodes.length}`)
    const head = this.app.playlist.list.head
    const tail = this.app.playlist.list.tail
    setText(
      this.pointers,
      nodes.length === 0 ? 'head = null, tail = null' : `head = ${head?.value.title ?? 'null'}, tail = ${tail?.value.title ?? 'null'}`,
    )
    this.renderCurrent()
    const items = nodes.map((node) => this.refs.get(node.id)?.item).filter((item): item is HTMLLIElement => Boolean(item))
    this.flip.play(items, popIn)
    if (change === 'add' || change === 'remove' || change === 'move') {
      drawLinks(this.track.querySelectorAll<SVGPathElement>('.link__glyph path'))
    }
  }

  private terminal(text: string, side: 'start' | 'end'): HTMLLIElement {
    return el('li', { class: `terminal terminal--${side}`, attrs: { 'aria-hidden': 'true' } }, [
      el('span', { class: 'terminal__null', text }),
    ])
  }

  private create(node: SongNode): NodeRefs {
    const refs: NodeRefs = {
      item: el('li', { class: 'node', attrs: { 'data-node-id': node.id } }),
      button: el('button', { class: 'node__card', attrs: { type: 'button' } }),
      index: el('span', { class: 'node__index' }),
      title: el('span', { class: 'node__title' }),
      time: el('span', { class: 'node__time' }),
    }
    refs.button.append(refs.index, refs.title, refs.time)
    refs.item.append(
      el('span', { class: 'node__tag node__tag--head', text: 'HEAD', attrs: { 'aria-hidden': 'true' } }),
      el('span', { class: 'node__tag node__tag--tail', text: 'TAIL', attrs: { 'aria-hidden': 'true' } }),
      refs.button,
    )
    refs.button.addEventListener('click', () => void this.app.play(node.id))
    this.refs.set(node.id, refs)
    return refs
  }

  private update(refs: NodeRefs, node: SongNode, index: number, size: number): void {
    const song = node.value
    refs.item.style.setProperty('--grow', String(nodeGrow(song.durationMs)))
    refs.item.dataset.head = String(index === 0)
    refs.item.dataset.tail = String(index === size - 1)
    refs.item.dataset.unavailable = String(Boolean(song.unavailable))
    setText(refs.index, `#${index + 1}`)
    setText(refs.title, song.title)
    refs.button.title = `#${index + 1} ${song.title}`
    setText(refs.time, formatTime(song.durationMs))
    const prev = node.prev?.value.title ?? 'null'
    const next = node.next?.value.title ?? 'null'
    refs.button.setAttribute(
      'aria-label',
      `Node ${index + 1} of ${size}: ${song.title}. prev ${prev}, next ${next}.${index === 0 ? ' Head.' : ''}${index === size - 1 ? ' Tail.' : ''} Play.`,
    )
  }

  private renderCurrent(): void {
    const current = this.app.playlist.current?.id ?? null
    const playing = this.app.playback.isPlaying
    const currentNode = this.app.playlist.current
    const position = currentNode ? this.app.playlist.list.indexOf(currentNode) + 1 : 0
    setText(
      this.now,
      currentNode ? `current = #${position} ${currentNode.value.title} \u00b7 ${formatTime(currentNode.value.durationMs)}` : 'current = null',
    )
    for (const [id, refs] of this.refs) {
      const active = id === current
      refs.item.dataset.current = String(active)
      refs.item.dataset.playing = String(active && playing)
      if (active) refs.button.setAttribute('aria-current', 'true')
      else refs.button.removeAttribute('aria-current')
    }
    if (current && this.lastCurrent && current !== this.lastCurrent) {
      const from = this.refs.get(this.lastCurrent)?.item
      const to = this.refs.get(current)?.item
      if (from?.isConnected && to?.isConnected) travel(this.viewport, this.track, from, to)
    }
    if (current && current !== this.lastCurrent) {
      this.refs.get(current)?.item.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest', inline: 'center' })
    }
    this.lastCurrent = current
  }
}
