import '../styles/tokens.css'
import '../styles/base.css'
import './landing.css'
import { etaFor, formatClock } from '../core/eta.ts'
import { services } from '../services/provider.ts'
import { el, setText } from '../ui/dom.ts'
import { icon } from '../ui/icons.ts'
import { ChainDemo } from './chainDemo.ts'

const REPO = 'https://github.com/Juansit-0/ORBIT'

interface Satellite {
  id: string
  label: string
  angle: number
}

const SATELLITES: Satellite[] = [
  { id: 'list', label: 'The list', angle: 0 },
  { id: 'dj', label: 'Auto DJ', angle: 90 },
  { id: 'lyrics', label: 'Lyrics', angle: 180 },
  { id: 'eta', label: 'Landing time', angle: 270 },
]

const FRONT_ANGLE = 200

const SAMPLE_LYRICS = [
  'Every song you add becomes a node',
  'Each one remembers who came before',
  'Press next and the pointer moves along',
  'The tail still waits for one song more',
]

const PLAN = [
  { id: 'a', title: 'Get Lucky', artist: 'Daft Punk', durationMs: 369000 },
  { id: 'b', title: 'Blinding Lights', artist: 'The Weeknd', durationMs: 200000 },
  { id: 'c', title: 'Dreams', artist: 'Fleetwood Mac', durationMs: 254000 },
  { id: 'd', title: 'De Música Ligera', artist: 'Soda Stereo', durationMs: 212000 },
]

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function header(): HTMLElement {
  return el('header', { class: 'top' }, [
    el('a', { class: 'top__brand', attrs: { href: '/', 'aria-label': 'Orbit home' } }, [icon('orbit', 'icon top__mark'), el('span', { text: 'Orbit' })]),
    el('nav', { class: 'top__nav', attrs: { 'aria-label': 'Site' } }, [
      el('a', { class: 'top__link', text: 'Source on GitHub', attrs: { href: REPO, rel: 'noopener' } }),
      el('a', { class: 'top__open', text: 'Open Orbit', attrs: { href: '/app/' } }),
    ]),
  ])
}

function stage(): { root: HTMLElement; anchor: HTMLElement; setActive: (id: string) => void } {
  const anchor = el('div', { class: 'stage__planet', attrs: { 'aria-hidden': 'true' } })
  const ring = el('div', { class: 'stage__ring', attrs: { 'aria-hidden': 'true' } })
  const buttons = SATELLITES.map((satellite) => {
    const link = el('a', {
      class: 'sat',
      attrs: { href: `#${satellite.id}`, 'data-sat': satellite.id, style: `--a:${satellite.angle}deg` },
    }, [el('span', { class: 'sat__dot', attrs: { 'aria-hidden': 'true' } }), el('span', { class: 'sat__label', text: satellite.label })])
    return link
  })
  const orbit = el('nav', { class: 'stage__orbit', attrs: { 'aria-label': 'Sections' } }, buttons)
  const leader = el('span', { class: 'stage__leader', attrs: { 'aria-hidden': 'true' } })
  const frame = el('div', { class: 'stage__frame' }, [ring, anchor, orbit])
  const root = el('div', { class: 'stage' }, [leader, frame])
  let current = ''
  const placeLabels = () => {
    const box = frame.getBoundingClientRect()
    const turn = parseFloat(orbit.style.getPropertyValue('--turn')) || 0
    for (const link of buttons) {
      const satellite = SATELLITES.find((entry) => entry.id === link.dataset.sat) as Satellite
      const radians = ((satellite.angle + turn) * Math.PI) / 180
      const x = box.left + box.width / 2 + (box.width / 2) * Math.cos(radians)
      const room = link.querySelector<HTMLElement>('.sat__label')?.offsetWidth ?? 120
      let side: 'left' | 'right' = Math.cos(radians) < 0 ? 'left' : 'right'
      if (side === 'right' && x + room + 24 > window.innerWidth) side = 'left'
      else if (side === 'left' && x - room - 24 < 0) side = 'right'
      link.dataset.side = side
      if (link.dataset.sat === current) root.style.setProperty('--label', side === 'left' ? `${room + 8}px` : '0px')
    }
  }
  window.addEventListener('resize', placeLabels)
  const setActive = (id: string) => {
    if (id === current) return
    current = id
    const target = SATELLITES.find((satellite) => satellite.id === id)
    const turn = target ? FRONT_ANGLE - target.angle : 0
    orbit.style.setProperty('--turn', `${turn}deg`)
    for (const link of buttons) {
      if (link.dataset.sat === id) link.setAttribute('aria-current', 'true')
      else link.removeAttribute('aria-current')
    }
    placeLabels()
    leader.classList.remove('stage__leader--drawn')
    void leader.offsetWidth
    leader.classList.add('stage__leader--drawn')
  }
  return { root, anchor, setActive }
}

function hero(): HTMLElement {
  return el('section', { class: 'hero', attrs: { 'aria-labelledby': 'hero-title' } }, [
    el('h1', { class: 'hero__title', text: 'Your playlist is a doubly linked list.', attrs: { id: 'hero-title' } }),
    el('p', { class: 'hero__lead', text: 'Orbit plays any song in full and shows the list underneath: HEAD, TAIL and every next and prev pointer, rewired each time you add a song first, last or at any position.' }),
    el('div', { class: 'hero__actions' }, [
      el('a', { class: 'cta', attrs: { href: '/app/' } }, [el('span', { text: 'Open Orbit' })]),
      el('a', { class: 'hero__how', text: 'See how the list works', attrs: { href: '#list' } }),
    ]),
  ])
}

function chapter(id: string, title: string, body: string[], figure: HTMLElement): HTMLElement {
  return el('section', { class: 'chapter', attrs: { id, 'aria-labelledby': `${id}-title`, 'data-chapter': id } }, [
    el('h2', { class: 'chapter__title', text: title, attrs: { id: `${id}-title` } }),
    ...body.map((text) => el('p', { class: 'chapter__text', text })),
    figure,
  ])
}

function djFigure(): HTMLElement {
  const svg = `<svg class="dj-plot__svg" viewBox="0 0 400 164" role="img" aria-label="Volume of the current song fading out in its last 8 seconds while the next song fades in over 2.5 seconds">
    <path class="dj-plot__grid" d="M20 20H390M20 70H390M20 120H390"/>
    <path class="dj-plot__out" d="M20 30H230C262 30 272 128 300 130"/>
    <path class="dj-plot__in" d="M300 130C310 128 314 30 322 30H390"/>
    <path class="dj-plot__mark" d="M230 14V140M300 14V140M322 14V140"/>
    <text class="dj-plot__label" x="225" y="156" text-anchor="end">8 s left</text>
    <text class="dj-plot__label" x="296" y="156" text-anchor="end">next song</text>
    <text class="dj-plot__label" x="326" y="156" text-anchor="start">+2.5 s</text>
    <text class="dj-plot__label" x="20" y="12">volume</text>
  </svg>`
  const plot = el('figure', { class: 'dj-plot' })
  plot.innerHTML = svg
  plot.append(el('figcaption', { class: 'dj-plot__legend' }, [
    el('span', { class: 'dj-plot__key dj-plot__key--out', text: 'Current song' }),
    el('span', { class: 'dj-plot__key dj-plot__key--in', text: 'Next song' }),
  ]))
  return plot
}

function lyricsFigure(): HTMLElement {
  const lines = SAMPLE_LYRICS.map((text, index) => el('li', { class: 'karaoke__line', text, attrs: { 'data-active': String(index === 1) } }))
  const figure = el('figure', { class: 'karaoke' }, [
    el('ol', { class: 'karaoke__lines', attrs: { 'aria-label': 'Sample lyrics' } }, lines),
    el('figcaption', { class: 'karaoke__note', text: 'Sample lines written for this page. In the player, synced lyrics come from LRCLIB.' }),
  ])
  let active = 1
  let timer: number | undefined
  const step = () => {
    active = (active + 1) % lines.length
    lines.forEach((line, index) => (line.dataset.active = String(index === active)))
  }
  new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting)
    window.clearInterval(timer)
    if (visible && !reducedMotion()) timer = window.setInterval(step, 2200)
  }).observe(figure)
  return figure
}

function landingFigure(): HTMLElement {
  const list = el('ol', { class: 'plan', attrs: { 'aria-label': 'Sample flight plan' } })
  const lands = el('p', { class: 'plan__lands' })
  const render = () => {
    const now = Date.now()
    const result = etaFor({ order: PLAN, currentId: 'a', positionMs: 141000, currentDurationMs: 369000, now, repeat: 'off' })
    list.replaceChildren(...PLAN.map((song, index) => {
      const start = result.starts.get(song.id)
      return el('li', { class: 'plan__row', attrs: { 'data-current': String(index === 0) } }, [
        el('span', { class: 'plan__dot', attrs: { 'aria-hidden': 'true' } }),
        el('span', { class: 'plan__song' }, [el('span', { class: 'plan__title', text: song.title }), el('span', { class: 'plan__artist', text: song.artist })]),
        el('span', { class: 'plan__time', text: start === undefined ? 'now' : formatClock(start) }),
      ])
    }))
    setText(lands, result.landsAt === null ? '' : `Lands at ${formatClock(result.landsAt)}`)
  }
  render()
  window.setInterval(render, 30000)
  return el('figure', { class: 'plan-figure' }, [lands, list, el('figcaption', { class: 'plan__note', text: 'A sample plan, timed from your clock right now.' })])
}

function servicesSection(): HTMLElement {
  const spotifyReady = Boolean(import.meta.env.VITE_SPOTIFY_CLIENT_ID)
  const rows = services(spotifyReady).map((service) => {
    const ready = service.status === 'ready'
    const status = ready ? (service.id === 'youtube' ? 'Start free' : service.id === 'spotify' ? 'Link and start' : 'Start, no account') : service.status === 'soon' ? 'Coming soon' : 'Not available on this site yet'
    const cells = [
      el('span', { class: 'services__name', text: service.name }),
      el('span', { class: 'services__line', text: service.line }),
      el('span', { class: 'services__status', text: status }),
    ]
    return el('li', { class: 'services__item' }, [
      ready
        ? el('a', { class: 'services__row', attrs: { href: `/app/?service=${service.id}`, 'data-status': service.status, 'aria-label': `${status} with ${service.name}` } }, cells)
        : el('div', { class: 'services__row', attrs: { 'data-status': service.status } }, cells),
    ])
  })
  return el('section', { class: 'services', attrs: { id: 'services', 'aria-labelledby': 'services-title' } }, [
    el('h2', { class: 'services__title', text: 'Listen with what you have.', attrs: { id: 'services-title' } }),
    el('p', { class: 'services__lead', text: 'Start with any of these now, or choose later when you open the player. Your flight plan, lyrics and Auto DJ work the same with each one.' }),
    el('ul', { class: 'services__list' }, rows),
  ])
}

function closing(): HTMLElement {
  return el('section', { class: 'close', attrs: { 'aria-labelledby': 'close-title' } }, [
    el('h2', { class: 'close__title', text: 'Ready for launch.', attrs: { id: 'close-title' } }),
    el('p', { class: 'close__lead', text: 'Search any song, add it first, last or at an exact position, and watch the list rewire.' }),
    el('a', { class: 'cta', attrs: { href: '/app/' } }, [el('span', { text: 'Open Orbit' })]),
    el('footer', { class: 'close__foot' }, [
      el('p', { text: 'Built by Juan Camilo López Díaz for the Taller Listas Dobles.' }),
      el('a', { class: 'close__link', text: 'Read the source on GitHub', attrs: { href: REPO, rel: 'noopener' } }),
    ]),
  ])
}

function mountPlanet(anchor: HTMLElement): void {
  if (reducedMotion()) return
  const canvas = document.createElement('canvas')
  try {
    if (!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))) return
  } catch {
    return
  }
  const start = () => {
    void import('../scene/OrbitScene.ts').then(({ OrbitScene }) => {
      const scene = document.createElement('canvas')
      scene.className = 'scene'
      scene.setAttribute('aria-hidden', 'true')
      document.body.prepend(scene)
      const small = window.matchMedia('(max-width: 900px)').matches
      const orbit = new OrbitScene({ canvas: scene, anchor, particleCount: small ? 4000 : 11000, intro: true })
      const began = performance.now()
      orbit.setPlayback({ playing: true, trackKey: 'orbit-landing', positionMs: 0, artworkUrl: null })
      window.setInterval(() => orbit.setPlayback({ playing: true, trackKey: 'orbit-landing', positionMs: performance.now() - began, artworkUrl: null }), 4000)
      document.documentElement.classList.add('has-scene')
      requestAnimationFrame(() => scene.classList.add('scene--ready'))
    })
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 900 })
  else setTimeout(start, 200)
}

const root = document.querySelector<HTMLElement>('#landing')
const params = new URLSearchParams(location.search)

if (params.has('plan')) {
  location.replace(`/app/${location.search}`)
} else if (root) {
  const orbit = stage()
  const chain = new ChainDemo()
  const heroSection = hero()
  const flow = el('div', { class: 'orbit__flow' }, [
    heroSection,
    chapter('list', 'Every song is a node.', [
      'Each song points to the one after it and the one before it. HEAD is the first song, TAIL the last, and the player walks the pointers when you press next or previous.',
      'Adding a song at position 2 does not shift an array: two neighbours change where they point. Try it below.',
    ], chain.root),
    chapter('dj', 'Songs hand over, they never stop.', [
      'Turn on Auto DJ and, in the last 8 seconds of a song, Orbit fades it out, starts the next one and brings it in over two and a half seconds, while the planet spins up for the handover.',
      'Pausing, seeking or skipping cancels the mix and gives you your volume back.',
    ], djFigure()),
    chapter('lyrics', 'Sing along, line by line.', [
      'Synced lyrics open under the song title and follow the music. Click any line to jump straight to it.',
    ], lyricsFigure()),
    chapter('eta', 'Know when the music lands.', [
      'Every song in the flight plan shows the time it will start, and the header tells you when the last one ends. Shuffle, skips and removed songs update it at once.',
    ], landingFigure()),
  ])
  const main = el('main', { class: 'orbit' }, [flow, orbit.root])
  root.append(header(), main, servicesSection(), closing())
  orbit.setActive('list')
  const chapters = [...flow.querySelectorAll<HTMLElement>('[data-chapter]')]
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) orbit.setActive(entry.target.getAttribute('data-chapter') ?? 'list')
    }
  }, { rootMargin: '-45% 0px -45% 0px' })
  for (const chapterElement of chapters) observer.observe(chapterElement)
  new IntersectionObserver(([entry]) => main.classList.toggle('orbit--docked', !entry?.isIntersecting), { rootMargin: '-35% 0px 0px 0px' }).observe(heroSection)
  new IntersectionObserver(([entry]) => main.classList.toggle('orbit--away', !entry?.isIntersecting), { rootMargin: '0px 0px -85% 0px' }).observe(main)
  mountPlanet(orbit.anchor)
}
