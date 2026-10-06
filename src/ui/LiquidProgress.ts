import { reducedMotion } from './motion.ts'

export class LiquidProgress {
  readonly canvas: HTMLCanvasElement
  private readonly context: CanvasRenderingContext2D | null
  private progress = 0
  private playing = false
  private amplitude = 0
  private frame = 0
  private last = performance.now()
  private phase = 0
  private colors = { track: '#cbdcea', fill: '#ff7a1a' }

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'liquid'
    this.canvas.setAttribute('aria-hidden', 'true')
    this.context = this.canvas.getContext('2d')
    const css = getComputedStyle(document.documentElement)
    this.colors = {
      track: css.getPropertyValue('--mist-strong').trim() || this.colors.track,
      fill: css.getPropertyValue('--burn').trim() || this.colors.fill,
    }
    new ResizeObserver(() => this.draw()).observe(this.canvas)
  }

  update(progress: number, playing: boolean): void {
    this.progress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
    if (playing !== this.playing) {
      this.playing = playing
      if (playing) this.loop()
    }
    if (!this.frame) this.draw()
  }

  private loop(): void {
    cancelAnimationFrame(this.frame)
    const step = (now: number) => {
      const delta = Math.min(0.05, (now - this.last) / 1000)
      this.last = now
      const target = this.playing && !reducedMotion() ? 2.2 : 0
      this.amplitude += (target - this.amplitude) * Math.min(1, delta * 4)
      this.phase += delta * 5.5
      this.draw()
      if (this.playing || this.amplitude > 0.05) this.frame = requestAnimationFrame(step)
      else this.frame = 0
    }
    this.last = performance.now()
    this.frame = requestAnimationFrame(step)
  }

  private draw(): void {
    const context = this.context
    if (!context) return
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    const width = this.canvas.clientWidth
    const height = this.canvas.clientHeight
    if (width === 0 || height === 0) return
    if (this.canvas.width !== Math.round(width * ratio)) this.canvas.width = Math.round(width * ratio)
    if (this.canvas.height !== Math.round(height * ratio)) this.canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    const inset = 8
    const usable = width - inset * 2
    const mid = height / 2
    context.lineCap = 'round'
    context.lineWidth = 4
    context.strokeStyle = this.colors.track
    context.beginPath()
    context.moveTo(inset, mid)
    context.lineTo(width - inset, mid)
    context.stroke()
    const end = inset + usable * this.progress
    if (end <= inset + 0.5) return
    context.strokeStyle = this.colors.fill
    context.beginPath()
    for (let x = inset; x <= end; x += 2) {
      const fade = Math.min(1, (end - x) / 24)
      const y = mid + Math.sin(x * 0.16 - this.phase) * this.amplitude * fade
      if (x === inset) context.moveTo(x, y)
      else context.lineTo(x, y)
    }
    context.lineTo(end, mid)
    context.stroke()
  }
}
