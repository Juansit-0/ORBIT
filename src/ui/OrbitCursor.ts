import { gsap } from 'gsap'
import { reducedMotion } from './motion.ts'

const INTERACTIVE = 'button:not(:disabled), a, input, [role="tab"], label, .lyric, .node__card'

export function mountOrbitCursor(): void {
  if (reducedMotion() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
  const ring = document.createElement('div')
  ring.className = 'cursor'
  ring.setAttribute('aria-hidden', 'true')
  ring.append(document.createElement('span'))
  document.body.append(ring)
  const toX = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' })
  const toY = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' })
  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return
      ring.dataset.visible = 'true'
      toX(event.clientX)
      toY(event.clientY)
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null
      ring.dataset.active = String(Boolean(target))
    },
    { passive: true },
  )
  window.addEventListener('pointerdown', () => (ring.dataset.pressed = 'true'))
  window.addEventListener('pointerup', () => (ring.dataset.pressed = 'false'))
  document.documentElement.addEventListener('pointerleave', () => (ring.dataset.visible = 'false'))
}
