import { DoublyLinkedList } from '../core/DoublyLinkedList.ts'
import type { ListNode } from '../core/ListNode.ts'
import { el, setText } from '../ui/dom.ts'

const POOL = ['Get Lucky', 'Blinding Lights', 'Dreams', 'Levitating', 'Viva La Vida', 'De Música Ligera', 'Bohemian Rhapsody', 'BIRDS OF A FEATHER']

export class ChainDemo {
  readonly root: HTMLElement
  private readonly list = new DoublyLinkedList<string>()
  private current: ListNode<string> | null = null
  private readonly chain: HTMLElement
  private readonly log: HTMLElement
  private readonly pointer: HTMLElement
  private nextSong = 3
  private fresh: ListNode<string> | null = null

  constructor() {
    for (const title of POOL.slice(0, 3)) this.list.addLast(title)
    this.current = this.list.head
    this.chain = el('ol', { class: 'chain-demo__chain', attrs: { 'aria-label': 'Doubly linked list' } })
    this.log = el('p', { class: 'chain-demo__log', attrs: { 'aria-live': 'polite' } })
    this.pointer = el('p', { class: 'chain-demo__pointer' })
    const action = (label: string, run: () => string) => {
      const button = el('button', { class: 'chain-demo__action', text: label, attrs: { type: 'button' } })
      button.addEventListener('click', () => {
        const message = run()
        this.render(true)
        setText(this.log, message)
      })
      return button
    }
    this.root = el('figure', { class: 'chain-demo' }, [
      el('div', { class: 'chain-demo__viewport' }, [this.chain]),
      this.pointer,
      el('div', { class: 'chain-demo__actions', attrs: { role: 'group', 'aria-label': 'List operations' } }, [
        action('Add first', () => {
          const title = this.take()
          this.fresh = this.list.addFirst(title)
          return `addFirst("${title}"): HEAD now points to it, and its next points to the old head.`
        }),
        action('Add last', () => {
          const title = this.take()
          this.fresh = this.list.addLast(title)
          return `addLast("${title}"): TAIL now points to it, and its prev points to the old tail.`
        }),
        action('Insert at 2', () => {
          const title = this.take()
          this.fresh = this.list.insertAt(Math.min(1, this.list.size), title)
          return `insertAt(2, "${title}"): the nodes around position 2 rewire their next and prev to it.`
        }),
        action('Next', () => {
          if (!this.current) return 'The list is empty.'
          if (!this.current.next) return `"${this.current.value}" is the TAIL: next is null.`
          this.current = this.current.next
          return `next(): current follows the next pointer to "${this.current.value}".`
        }),
        action('Previous', () => {
          if (!this.current) return 'The list is empty.'
          if (!this.current.prev) return `"${this.current.value}" is the HEAD: prev is null.`
          this.current = this.current.prev
          return `previous(): current follows the prev pointer back to "${this.current.value}".`
        }),
        action('Remove current', () => {
          const node = this.current
          if (!node) return 'The list is empty.'
          this.current = node.next ?? node.prev
          this.list.removeNode(node)
          return `remove("${node.value}"): its neighbours now point to each other.`
        }),
      ]),
      this.log,
    ])
    setText(this.log, 'Try an operation. Every button calls the same doubly linked list the player uses.')
    this.render()
  }

  private take(): string {
    const title = POOL[this.nextSong % POOL.length] as string
    this.nextSong += 1
    return title
  }

  private render(follow = false): void {
    if (!this.current) this.current = this.list.head
    const nodes = this.list.nodes()
    const items: HTMLElement[] = [el('li', { class: 'chain-demo__null', text: 'null', attrs: { 'aria-hidden': 'true' } })]
    nodes.forEach((node, index) => {
      const tags = [index === 0 ? 'HEAD' : '', index === nodes.length - 1 ? 'TAIL' : ''].filter(Boolean).join(' · ')
      const item = el('li', {
        class: 'chain-demo__node',
        attrs: {
          'data-current': String(node === this.current),
          'data-fresh': String(node === this.fresh),
          'aria-label': `${index + 1}. ${node.value}${tags ? `, ${tags}` : ''}${node === this.current ? ', current' : ''}`,
        },
      }, [
        el('span', { class: 'chain-demo__tag', text: tags, attrs: { 'aria-hidden': 'true' } }),
        el('span', { class: 'chain-demo__index', text: String(index + 1).padStart(2, '0'), attrs: { 'aria-hidden': 'true' } }),
        el('span', { class: 'chain-demo__title', text: node.value }),
      ])
      items.push(item)
      if (index < nodes.length - 1) items.push(el('li', { class: 'chain-demo__link', attrs: { 'aria-hidden': 'true' } }, [el('span', { class: 'chain-demo__next' }), el('span', { class: 'chain-demo__prev' })]))
    })
    items.push(el('li', { class: 'chain-demo__null', text: 'null', attrs: { 'aria-hidden': 'true' } }))
    this.chain.replaceChildren(...items)
    this.fresh = null
    setText(this.pointer, this.current ? `size ${this.list.size} · current → ${this.current.value}` : 'size 0 · current → null')
    const viewport = this.chain.parentElement
    const target = this.chain.querySelector<HTMLElement>('[data-current="true"]')
    if (follow && viewport && target) viewport.scrollTo({ left: target.offsetLeft - viewport.clientWidth / 2 + target.offsetWidth / 2, behavior: 'smooth' })
  }
}
