import { isProvider, type Provider, type Service } from '../services/provider.ts'
import { el, setText } from './dom.ts'
import { icon } from './icons.ts'

export class ProviderGate {
  readonly root: HTMLElement

  constructor(list: Service[], choose: (provider: Provider) => void) {
    const cards = list.map((service) => {
      const note = el('p', { class: 'gate__note', attrs: { id: `gate-note-${service.id}`, 'aria-live': 'polite' } })
      const action = service.status === 'ready' ? (service.id === 'spotify' ? 'Connect' : 'Continue') : service.status === 'soon' ? 'Coming soon' : 'Not set up'
      const button = el('button', {
        class: `gate__card gate__card--${service.status}`,
        attrs: { type: 'button', 'data-service': service.id, 'aria-describedby': `gate-note-${service.id}` },
      }, [
        el('span', { class: 'gate__text' }, [
          el('span', { class: 'gate__name' }, [service.name, service.id === 'youtube' ? el('span', { class: 'gate__badge', text: 'Default' }) : '']),
          el('span', { class: 'gate__line', text: service.line }),
        ]),
        el('span', { class: 'gate__action' }, [el('span', { text: action }), service.status === 'ready' ? icon('next2', 'icon gate__arrow') : '']),
      ])
      button.addEventListener('click', () => {
        if (service.status === 'ready' && isProvider(service.id)) {
          choose(service.id)
          return
        }
        setText(note, service.note)
        button.dataset.told = 'true'
      })
      return el('li', { class: 'gate__item' }, [button, note])
    })
    this.root = el('main', { class: 'gate', attrs: { 'aria-labelledby': 'gate-title' } }, [
      el('div', { class: 'gate__panel' }, [
        el('a', { class: 'gate__brand', attrs: { href: '/' } }, [icon('orbit', 'icon gate__mark'), el('span', { text: 'Orbit' })]),
        el('h1', { class: 'gate__title', text: 'How do you want to listen?', attrs: { id: 'gate-title' } }),
        el('p', { class: 'gate__lead', text: 'Your flight plan works the same with every service. You can change this later from the More menu.' }),
        el('ul', { class: 'gate__list' }, cards),
      ]),
    ])
  }
}
