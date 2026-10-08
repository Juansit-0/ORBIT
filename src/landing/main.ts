import '../styles/tokens.css'
import '../styles/base.css'
import '../styles/components.css'
import './landing.css'
import { el } from '../ui/dom.ts'
import { icon } from '../ui/icons.ts'

const root = document.querySelector<HTMLElement>('#landing')
const params = new URLSearchParams(location.search)

if (params.has('plan')) {
  location.replace(`/app/${location.search}`)
} else if (root) {
  root.append(
    el('main', { class: 'landing' }, [
      el('p', { class: 'landing__brand' }, [icon('orbit', 'icon landing__mark'), el('span', { text: 'Orbit' })]),
      el('h1', { class: 'landing__title', text: 'Every song in orbit.' }),
      el('p', { class: 'landing__lead', text: 'A music player whose playlist is a doubly linked list. Add a song first, last or at any position, and play it in full.' }),
      el('a', { class: 'button button--primary landing__cta', text: 'Open Orbit', attrs: { href: '/app/' } }),
    ]),
  )
}
