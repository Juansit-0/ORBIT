import { gsap } from 'gsap'

const reducedQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

export function reducedMotion(): boolean {
  return reducedQuery?.matches ?? true
}

export function cascadeText(target: HTMLElement, text: string): void {
  if (target.getAttribute('aria-label') === text && target.dataset.cascaded === 'true') return
  target.setAttribute('aria-label', text)
  if (reducedMotion()) {
    target.textContent = text
    target.dataset.cascaded = 'true'
    return
  }
  gsap.killTweensOf(target.querySelectorAll('.char'))
  const words = text.split(/(\s+)/)
  const fragment = document.createDocumentFragment()
  const chars: HTMLElement[] = []
  for (const word of words) {
    if (/^\s+$/.test(word)) {
      fragment.append(document.createTextNode(word))
      continue
    }
    const wrap = document.createElement('span')
    wrap.className = 'word'
    wrap.setAttribute('aria-hidden', 'true')
    for (const char of word) {
      const span = document.createElement('span')
      span.className = 'char'
      span.textContent = char
      wrap.append(span)
      chars.push(span)
    }
    fragment.append(wrap)
  }
  target.replaceChildren(fragment)
  target.dataset.cascaded = 'true'
  gsap.fromTo(
    chars,
    { yPercent: 110, opacity: 0, rotateX: -70 },
    {
      yPercent: 0,
      opacity: 1,
      rotateX: 0,
      duration: 0.55,
      ease: 'expo.out',
      stagger: { each: Math.min(0.03, 0.6 / Math.max(1, chars.length)) },
      clearProps: 'transform,opacity',
    },
  )
}

export function fadeSwap(target: HTMLElement): void {
  if (reducedMotion()) return
  gsap.fromTo(target, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform,opacity' })
}

export class FlipTracker {
  private positions = new Map<string, { x: number; y: number }>()
  private readonly key: string

  constructor(key: string) {
    this.key = key
  }

  snapshot(elements: Iterable<HTMLElement>): void {
    this.positions.clear()
    for (const element of elements) {
      const id = element.dataset[this.key]
      if (id) this.positions.set(id, { x: element.offsetLeft, y: element.offsetTop })
    }
  }

  play(elements: Iterable<HTMLElement>, enter: (element: HTMLElement) => void): void {
    const reduced = reducedMotion()
    const previous = this.positions
    const hadSnapshot = previous.size > 0
    this.positions = new Map()
    for (const element of elements) {
      const id = element.dataset[this.key]
      if (!id) continue
      const now = { x: element.offsetLeft, y: element.offsetTop }
      this.positions.set(id, now)
      if (reduced || element.hidden) continue
      const before = previous.get(id)
      if (!before) {
        if (hadSnapshot) enter(element)
        continue
      }
      const dx = before.x - now.x
      const dy = before.y - now.y
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        gsap.fromTo(element, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform', overwrite: true })
      }
    }
  }
}

export function exitRow(row: HTMLElement, onDone: () => void): void {
  if (reducedMotion() || !row.isConnected || row.hidden) {
    onDone()
    return
  }
  const top = row.offsetTop
  const left = row.offsetLeft
  const width = row.offsetWidth
  row.dataset.exiting = 'true'
  row.style.position = 'absolute'
  row.style.top = `${top}px`
  row.style.left = `${left}px`
  row.style.width = `${width}px`
  row.style.pointerEvents = 'none'
  gsap.to(row, { opacity: 0, x: 28, duration: 0.32, ease: 'power2.in', onComplete: onDone })
}

export function popIn(element: HTMLElement): void {
  gsap.fromTo(element, { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)', clearProps: 'transform,opacity' })
}

export function slideIn(element: HTMLElement): void {
  gsap.fromTo(
    element,
    { opacity: 0, x: -18 },
    { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out', clearProps: 'transform,opacity' },
  )
  element.animate?.(
    [{ backgroundColor: 'var(--chart-wash)' }, { backgroundColor: 'transparent' }],
    { duration: 1400, easing: 'ease-out' },
  )
}

export function drawLinks(paths: Iterable<SVGPathElement>): void {
  if (reducedMotion()) return
  for (const path of paths) {
    const length = path.getTotalLength?.() || 60
    gsap.fromTo(
      path,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.7, ease: 'power3.out', delay: Math.random() * 0.12, clearProps: 'strokeDasharray,strokeDashoffset' },
    )
  }
}

export function magnetize(button: HTMLElement, strength = 6): void {
  if (reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const toX = gsap.quickTo(button, 'x', { duration: 0.4, ease: 'power3.out' })
  const toY = gsap.quickTo(button, 'y', { duration: 0.4, ease: 'power3.out' })
  button.addEventListener('pointermove', (event) => {
    const rect = button.getBoundingClientRect()
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    toX(dx * strength)
    toY(dy * strength)
  })
  button.addEventListener('pointerleave', () => {
    toX(0)
    toY(0)
  })
}

export function travel(host: HTMLElement, track: HTMLElement, from: HTMLElement, to: HTMLElement): void {
  if (reducedMotion()) return
  const forward = to.offsetLeft > from.offsetLeft
  const start = track.offsetLeft + from.offsetLeft + from.offsetWidth / 2
  const end = track.offsetLeft + to.offsetLeft + to.offsetWidth / 2
  const spark = document.createElement('span')
  spark.className = `spark spark--${forward ? 'next' : 'prev'}`
  spark.setAttribute('aria-hidden', 'true')
  host.append(spark)
  const top = track.offsetTop + from.offsetTop + from.offsetHeight / 2 + (forward ? -5 : 5)
  gsap.fromTo(
    spark,
    { x: start, y: top, opacity: 0, scale: 0.6 },
    {
      keyframes: [
        { opacity: 1, scale: 1, duration: 0.12, ease: 'power2.out' },
        { x: end, duration: Math.min(1.1, 0.35 + Math.abs(end - start) / 600), ease: 'power2.inOut' },
        { opacity: 0, scale: 1.8, duration: 0.25, ease: 'power2.out' },
      ],
      onComplete: () => spark.remove(),
    },
  )
}
