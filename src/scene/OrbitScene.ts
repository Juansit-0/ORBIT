import {
  BufferAttribute,
  BufferGeometry,
  Color,
  NormalBlending,
  PerspectiveCamera,
  Points,
  Ray,
  Scene,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from 'three'
import noise from './noise.glsl?raw'
import coverFragment from './cover.frag?raw'
import coverVertex from './cover.vert?raw'
import fragmentShader from './particles.frag?raw'
import vertexSource from './particles.vert?raw'
import { buildTargets, sampleCover } from './coverMorph.ts'
import { blend } from './palette.ts'
import { profileFor, pulseAt, type PulseProfile } from './pulse.ts'

const TRAIL_LENGTH = 12
const FOV = 35
const CAMERA_DISTANCE = 6
const COVER_GRID = 84
const DISSOLVE_SECONDS = 2.8
const GATHER_SECONDS = 1.6
const DISSOLVE_DELAY = 0.55
const PALETTE_SIZE = 5
const PALETTE_MIX = 0.94
const INTERACTIVE = 'button, input, a, label, [role="tab"], [popover], .rail, .dock, .mast, .tabs, .toast, .lens, .deck__meta, .deck__controls'

export interface SceneOptions {
  canvas: HTMLCanvasElement
  anchor: HTMLElement
  particleCount: number
  intro: boolean
}

export interface PlaybackInput {
  playing: boolean
  trackKey: string | null
  positionMs: number
  artworkUrl: string | null
}

function coverAngle(element: HTMLElement): number {
  const transform = getComputedStyle(element).transform
  const match = /matrix\(([^,]+),\s*([^,]+)/.exec(transform)
  if (!match) return 0
  return Math.atan2(Number(match[2]), Number(match[1]))
}

function fibonacciSphere(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const radius = Math.sqrt(1 - y * y)
    const theta = golden * i
    positions[i * 3] = Math.cos(theta) * radius
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = Math.sin(theta) * radius
  }
  return positions
}

function ringBand(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  const tilt = (-24 * Math.PI) / 180
  const pitch = (14 * Math.PI) / 180
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 1.42 + (Math.random() - 0.5) * 0.16 + Math.pow(Math.random(), 3) * 0.2
    const height = (Math.random() - 0.5) * 0.05
    const x0 = Math.cos(angle) * radius
    const z0 = Math.sin(angle) * radius
    const y1 = height * Math.cos(pitch) - z0 * Math.sin(pitch)
    const z1 = height * Math.sin(pitch) + z0 * Math.cos(pitch)
    positions[i * 3] = x0 * Math.cos(tilt) - y1 * Math.sin(tilt)
    positions[i * 3 + 1] = x0 * Math.sin(tilt) + y1 * Math.cos(tilt)
    positions[i * 3 + 2] = z1
  }
  return positions
}

export class OrbitScene {
  private readonly renderer: WebGLRenderer
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 100)
  private readonly material: ShaderMaterial
  private readonly points: Points
  private readonly anchor: HTMLElement
  private readonly trail: Vector4[] = Array.from({ length: TRAIL_LENGTH }, () => new Vector4(0, 0, 0, 0))
  private readonly pointer = new Vector2(10, 10)
  private readonly parallax = new Vector2()
  private readonly ray = new Ray()
  private readonly sphere = new Sphere()
  private readonly lastHit = new Vector3(999, 999, 999)
  private trailIndex = 0
  private frame = 0
  private running = false
  private visible = true
  private start = performance.now()
  private lastFrame = performance.now()
  private energy = 0.15
  private shock = 1
  private profile: PulseProfile = profileFor('orbit')
  private input: PlaybackInput = { playing: false, trackKey: null, positionMs: 0, artworkUrl: null }
  private readonly cloud: Points
  private readonly cloudMaterial: ShaderMaterial
  private coverMix = 0
  private coverTarget = 0
  private coverDelay = 0
  private coverReady = false
  private readonly palette: Color[] = []
  private readonly paletteTarget: Color[] = []
  private paletteMix = 0
  private paletteMixTarget = 0
  private intro = 1
  private click = new Vector4(0, 0, 0, 1)
  private readonly baseChart: Color
  private readonly baseKey: Color
  private readonly targetChart: Color
  private readonly targetKey: Color
  private coverRequest = 0
  private inputStamp = performance.now()
  private readonly onPointer: (event: PointerEvent) => void
  private readonly onLeave: () => void
  private readonly onVisibility: () => void
  private readonly onPointerDown: (event: PointerEvent) => void

  constructor(options: SceneOptions) {
    this.anchor = options.anchor
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.camera.position.set(0, 0, CAMERA_DISTANCE)

    const sphereCount = options.particleCount
    this.intro = options.intro ? 0 : 1
    const ringCount = Math.round(options.particleCount * 0.2)
    const total = sphereCount + ringCount
    const positions = new Float32Array(total * 3)
    positions.set(fibonacciSphere(sphereCount), 0)
    positions.set(ringBand(ringCount), sphereCount * 3)
    const seeds = new Float32Array(total * 4)
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random()
    const ring = new Float32Array(total)
    ring.fill(1, sphereCount)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 4))
    geometry.setAttribute('aRing', new BufferAttribute(ring, 1))

    const css = getComputedStyle(document.documentElement)
    const token = (name: string, fallback: string) => new Color(css.getPropertyValue(name).trim() || fallback)
    this.baseChart = token('--chart-soft', '#5ba8e0')
    this.baseKey = new Color('#ffb27a')
    for (let i = 0; i < PALETTE_SIZE; i++) {
      this.palette.push(this.baseChart.clone())
      this.paletteTarget.push(this.baseChart.clone())
    }
    this.targetChart = this.baseChart.clone()
    this.targetKey = this.baseKey.clone()
    this.material = new ShaderMaterial({
      vertexShader: `#define TRAIL_LENGTH ${TRAIL_LENGTH}\n${noise}\n${vertexSource}`,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPulse: { value: 0 },
        uEnergy: { value: this.energy },
        uShock: { value: 1 },
        uIntro: { value: this.intro },
        uClick: { value: this.click },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uSize: { value: 4.4 },
        uScale: { value: 1 },
        uTrail: { value: this.trail },
        uKeyDir: { value: new Vector3(-0.65, 0.7, 0.55).normalize() },
        uInk: { value: token('--ink', '#10324a') },
        uChart: { value: this.baseChart.clone() },
        uBurn: { value: token('--burn', '#ff7a1a') },
        uKey: { value: this.baseKey.clone() },
        uPalette: { value: this.palette },
        uPaletteMix: { value: 0 },
      },
    })
    this.points = new Points(geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    const cells = COVER_GRID * COVER_GRID
    const cloudGeometry = new BufferGeometry()
    const sphere = new Float32Array(cells * 3)
    const cloudSeeds = new Float32Array(cells)
    for (let i = 0; i < cells; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 1 + (Math.random() - 0.5) * 0.06
      sphere[i * 3] = Math.sin(phi) * Math.cos(theta) * radius
      sphere[i * 3 + 1] = Math.cos(phi) * radius
      sphere[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius
      cloudSeeds[i] = Math.random()
    }
    cloudGeometry.setAttribute('position', new BufferAttribute(new Float32Array(cells * 3), 3))
    cloudGeometry.setAttribute('aGrid', new BufferAttribute(new Float32Array(cells * 2), 2))
    cloudGeometry.setAttribute('aColor', new BufferAttribute(new Float32Array(cells * 3), 3))
    cloudGeometry.setAttribute('aSphere', new BufferAttribute(sphere, 3))
    cloudGeometry.setAttribute('aSeed', new BufferAttribute(cloudSeeds, 1))
    this.cloudMaterial = new ShaderMaterial({
      vertexShader: coverVertex,
      fragmentShader: coverFragment,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
      uniforms: {
        uMix: { value: 0 },
        uHalf: { value: 1 },
        uScale: { value: 1 },
        uGridSize: { value: 4 },
        uSphereSize: { value: 2 },
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uCenter: { value: new Vector3() },
        uSphereMatrix: { value: this.points.matrixWorld },
        uOpacity: { value: 0 },
        uAngle: { value: 0 },
        uRound: { value: 0 },
        uGrowTo: { value: 1.6 },
        uCorner: { value: 0 },
        uCameraOffset: { value: new Vector2() },
      },
    })
    this.cloud = new Points(cloudGeometry, this.cloudMaterial)
    this.cloud.frustumCulled = false
    this.cloud.renderOrder = 1
    this.scene.add(this.cloud)

    this.onPointer = (event) => {
      this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
    }
    this.onLeave = () => this.pointer.set(10, 10)
    this.onVisibility = () => (document.hidden ? this.stop() : this.play())
    this.onPointerDown = (event) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest(INTERACTIVE))) return
      this.onPointer(event)
      const hit = this.hitTest(1.15)
      if (hit) this.click.set(hit.x, hit.y, hit.z, 0)
    }
    window.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', this.onLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
    this.play()
  }

  setPlayback(input: PlaybackInput): void {
    const changed = input.trackKey !== this.input.trackKey
    const transition = changed && this.input.trackKey !== null && input.trackKey !== null
    if (changed) this.profile = profileFor(input.trackKey ?? 'orbit')
    const coverChanged = input.artworkUrl !== this.input.artworkUrl
    this.input = input
    this.inputStamp = performance.now()
    if (coverChanged || changed) void this.loadCover(input.artworkUrl, transition)
  }

  setCoverShown(shown: boolean): void {
    const target = shown ? 0 : 1
    if (target === this.coverTarget) return
    this.coverTarget = target
    this.coverDelay = shown ? 0 : DISSOLVE_DELAY
  }

  private async loadCover(url: string | null, transition: boolean): Promise<void> {
    const request = ++this.coverRequest
    if (!url) {
      this.targetChart.copy(this.baseChart)
      this.targetKey.copy(this.baseKey)
      this.coverReady = false
      this.paletteMixTarget = 0
      if (transition) this.shock = 0
      return
    }
    try {
      const sample = await sampleCover(url, COVER_GRID)
      if (request !== this.coverRequest) return
      const vivid = sample.palette.vivid
      const chart = blend([this.baseChart.r, this.baseChart.g, this.baseChart.b], vivid, 0.55, 0.62)
      const key = blend([this.baseKey.r, this.baseKey.g, this.baseKey.b], vivid, 0.4, 0.85)
      this.targetChart.setRGB(...chart)
      this.targetKey.setRGB(...key)
      sample.swatches.forEach((swatch, index) => this.paletteTarget[index]?.setRGB(...swatch))
      this.paletteMixTarget = PALETTE_MIX
      const targets = buildTargets(COVER_GRID * COVER_GRID, sample, 0.12)
      const geometry = this.cloud.geometry
      const grid = geometry.getAttribute('aGrid') as BufferAttribute
      const color = geometry.getAttribute('aColor') as BufferAttribute
      ;(grid.array as Float32Array).set(targets.positions)
      ;(color.array as Float32Array).set(targets.colors)
      grid.needsUpdate = true
      color.needsUpdate = true
      this.coverReady = true
    } catch {
      this.coverReady = false
      if (request === this.coverRequest && transition) this.shock = 0
    }
  }

  private coverFrame(): { x: number; y: number; size: number; radius: number } | null {
    const lens = this.anchor.querySelector<HTMLElement>('.lens')
    if (!lens || lens.offsetWidth === 0) return null
    const stage = this.anchor.getBoundingClientRect()
    if (stage.width === 0) return null
    const radius = Number.parseFloat(getComputedStyle(lens).borderTopLeftRadius) || 0
    return { x: stage.left + stage.width / 2, y: stage.top + stage.height / 2, size: lens.offsetWidth, radius }
  }

  private updateCover(
    delta: number,
    lens: { x: number; y: number; size: number; radius: number } | null,
    worldPerPixel: number,
  ): void {
    if (this.coverDelay > 0) this.coverDelay = Math.max(0, this.coverDelay - delta)
    else if (this.coverMix < this.coverTarget) this.coverMix = Math.min(1, this.coverMix + delta / DISSOLVE_SECONDS)
    else if (this.coverMix > this.coverTarget) this.coverMix = Math.max(0, this.coverMix - delta / GATHER_SECONDS)
    const uniforms = this.cloudMaterial.uniforms
    uniforms.uMix!.value = this.coverMix
    const visible = this.coverTarget === 1 ? 1 : Math.min(1, this.coverMix * 5)
    uniforms.uOpacity!.value = this.coverReady && lens ? visible : 0
    if (!lens) return
    const half = (lens.size / 2) * worldPerPixel
    uniforms.uHalf!.value = half
    uniforms.uScale!.value = this.points.scale.x
    uniforms.uGrowTo!.value = Math.max(1, (this.points.scale.x * 0.9) / half)
    uniforms.uGridSize!.value = (lens.size / COVER_GRID) * 1.5
    uniforms.uCorner!.value = Math.min(1, (lens.radius * 2) / lens.size)
    ;(uniforms.uCameraOffset!.value as Vector2).set(this.camera.position.x, this.camera.position.y)
    const cover = this.anchor.querySelector<HTMLElement>('.lens__cover')
    const vinyl = document.documentElement.dataset.vinyl === 'true'
    uniforms.uRound!.value = vinyl ? 1 : 0
    uniforms.uAngle!.value = vinyl && cover ? coverAngle(cover) : 0
    uniforms.uSphereSize!.value = 2.2
    ;(uniforms.uCenter!.value as Vector3).set(
      (lens.x - window.innerWidth / 2) * worldPerPixel,
      -(lens.y - window.innerHeight / 2) * worldPerPixel,
      0,
    )
  }

  private hitTest(reach: number): Vector3 | null {
    this.ray.origin.copy(this.camera.position)
    this.ray.direction.set(this.pointer.x, this.pointer.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize()
    const radius = this.points.scale.x
    this.sphere.set(this.points.position, radius * reach)
    const hit = new Vector3()
    return this.ray.intersectSphere(this.sphere, hit) ? hit : null
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('pointerdown', this.onPointerDown)
    document.documentElement.removeEventListener('pointerleave', this.onLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.points.geometry.dispose()
    this.material.dispose()
    this.cloud.geometry.dispose()
    this.cloudMaterial.dispose()
    this.renderer.dispose()
  }

  private play(): void {
    if (this.running) return
    this.running = true
    this.lastFrame = performance.now()
    const loop = (now: number) => {
      if (!this.running) return
      this.tick(now)
      this.frame = requestAnimationFrame(loop)
    }
    this.frame = requestAnimationFrame(loop)
  }

  private stop(): void {
    this.running = false
    cancelAnimationFrame(this.frame)
  }

  private resize(): void {
    const width = window.innerWidth
    const height = window.innerHeight
    if (this.renderer.domElement.width !== Math.floor(width * this.renderer.getPixelRatio())) {
      this.renderer.setSize(width, height, false)
    } else if (this.renderer.domElement.height !== Math.floor(height * this.renderer.getPixelRatio())) {
      this.renderer.setSize(width, height, false)
    }
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private place(): boolean {
    const rect = this.anchor.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return false
    const height = window.innerHeight
    const worldPerPixel = (2 * CAMERA_DISTANCE * Math.tan((FOV * Math.PI) / 360)) / height
    const cx = rect.left + rect.width / 2 - window.innerWidth / 2
    const cy = rect.top + rect.height / 2 - height / 2
    const lens = this.anchor.querySelector('.lens')?.getBoundingClientRect()
    const radius = Math.max(Math.min(rect.width, rect.height) * 0.5, (lens?.width ?? 0) * 0.78) * worldPerPixel
    this.points.position.set(cx * worldPerPixel, -cy * worldPerPixel, 0)
    this.points.scale.setScalar(radius)
    this.material.uniforms.uScale!.value = radius
    return true
  }

  private updateTrail(): void {
    for (const point of this.trail) point.w *= 0.955
    if (Math.abs(this.pointer.x) > 1.5) return
    this.ray.origin.copy(this.camera.position)
    this.ray.direction.set(this.pointer.x, this.pointer.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize()
    const radius = this.points.scale.x
    this.sphere.set(this.points.position, radius * 1.08)
    const hit = new Vector3()
    if (!this.ray.intersectSphere(this.sphere, hit)) {
      const t = (this.points.position.z - this.ray.origin.z) / this.ray.direction.z
      this.ray.at(t, hit)
      if (hit.distanceTo(this.points.position) > radius * 1.9) return
    }
    if (hit.distanceTo(this.lastHit) < radius * 0.05) return
    this.lastHit.copy(hit)
    const slot = this.trail[this.trailIndex] as Vector4
    slot.set(hit.x, hit.y, hit.z, 1)
    this.trailIndex = (this.trailIndex + 1) % TRAIL_LENGTH
  }

  private tick(now: number): void {
    const delta = Math.min(0.05, (now - this.lastFrame) / 1000)
    this.lastFrame = now
    this.resize()
    this.visible = this.place()
    if (!this.visible) return
    const elapsed = (now - this.start) / 1000
    const playing = this.input.playing
    this.energy += ((playing ? 1 : 0.18) - this.energy) * Math.min(1, delta * 2.2)
    const position = this.input.positionMs + (playing ? now - this.inputStamp : 0)
    const beat = playing ? pulseAt(position, this.profile) : 0.5 + 0.5 * Math.sin(elapsed * 1.3)
    this.shock = Math.min(1, this.shock + delta / 1.3)
    this.intro = Math.min(1, this.intro + delta / 1.9)
    this.click.w = Math.min(1, this.click.w + delta / 1.4)
    const tint = Math.min(1, delta * 1.5)
    ;(this.material.uniforms.uChart!.value as Color).lerp(this.targetChart, tint)
    ;(this.material.uniforms.uKey!.value as Color).lerp(this.targetKey, tint)
    const swatchTint = Math.min(1, delta * 0.9)
    this.palette.forEach((color, index) => color.lerp(this.paletteTarget[index] as Color, swatchTint))
    this.paletteMix += (this.paletteMixTarget - this.paletteMix) * swatchTint
    this.material.uniforms.uPaletteMix!.value = this.paletteMix
    this.updateTrail()
    this.parallax.x += (Math.max(-1, Math.min(1, this.pointer.x)) * 0.12 - this.parallax.x) * Math.min(1, delta * 2)
    this.parallax.y += (Math.max(-1, Math.min(1, this.pointer.y)) * 0.08 - this.parallax.y) * Math.min(1, delta * 2)
    this.points.rotation.y += delta * (0.05 + this.energy * 0.07)
    this.points.rotation.x = Math.sin(elapsed * 0.11) * 0.12 + this.parallax.y
    this.points.rotation.z = this.parallax.x * 0.5
    this.camera.position.x = Math.sin(elapsed * 0.07) * 0.05
    this.camera.position.y = Math.cos(elapsed * 0.05) * 0.04
    const uniforms = this.material.uniforms
    uniforms.uTime!.value = elapsed
    uniforms.uPulse!.value = beat
    uniforms.uEnergy!.value = this.energy
    uniforms.uShock!.value = this.shock
    uniforms.uIntro!.value = this.intro
    this.points.updateMatrixWorld()
    this.updateCover(delta, this.coverFrame(), (2 * CAMERA_DISTANCE * Math.tan((FOV * Math.PI) / 360)) / window.innerHeight)
    this.renderer.render(this.scene, this.camera)
  }
}
