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
import fragmentShader from './particles.frag?raw'
import vertexSource from './particles.vert?raw'
import { profileFor, pulseAt, type PulseProfile } from './pulse.ts'

const TRAIL_LENGTH = 12
const FOV = 35
const CAMERA_DISTANCE = 6

export interface SceneOptions {
  canvas: HTMLCanvasElement
  anchor: HTMLElement
  particleCount: number
}

export interface PlaybackInput {
  playing: boolean
  trackKey: string | null
  positionMs: number
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
  private input: PlaybackInput = { playing: false, trackKey: null, positionMs: 0 }
  private inputStamp = performance.now()
  private readonly onPointer: (event: PointerEvent) => void
  private readonly onLeave: () => void
  private readonly onVisibility: () => void

  constructor(options: SceneOptions) {
    this.anchor = options.anchor
    this.renderer = new WebGLRenderer({ canvas: options.canvas, antialias: false, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.camera.position.set(0, 0, CAMERA_DISTANCE)

    const sphereCount = options.particleCount
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
        uPixelRatio: { value: this.renderer.getPixelRatio() },
        uSize: { value: 4.4 },
        uScale: { value: 1 },
        uTrail: { value: this.trail },
        uKeyDir: { value: new Vector3(-0.65, 0.7, 0.55).normalize() },
        uInk: { value: token('--ink', '#10324a') },
        uChart: { value: token('--chart-soft', '#5ba8e0') },
        uBurn: { value: token('--burn', '#ff7a1a') },
        uKey: { value: new Color('#ffb27a') },
      },
    })
    this.points = new Points(geometry, this.material)
    this.points.frustumCulled = false
    this.scene.add(this.points)

    this.onPointer = (event) => {
      this.pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1)
    }
    this.onLeave = () => this.pointer.set(10, 10)
    this.onVisibility = () => (document.hidden ? this.stop() : this.play())
    window.addEventListener('pointermove', this.onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', this.onLeave)
    document.addEventListener('visibilitychange', this.onVisibility)
    this.resize()
    this.play()
  }

  setPlayback(input: PlaybackInput): void {
    if (input.trackKey !== this.input.trackKey) {
      this.profile = profileFor(input.trackKey ?? 'orbit')
      if (this.input.trackKey !== null && input.trackKey !== null) this.shock = 0
    }
    this.input = input
    this.inputStamp = performance.now()
  }

  dispose(): void {
    this.stop()
    window.removeEventListener('pointermove', this.onPointer)
    document.documentElement.removeEventListener('pointerleave', this.onLeave)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.points.geometry.dispose()
    this.material.dispose()
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
    const radius = Math.min(rect.width, rect.height) * 0.47 * worldPerPixel
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
    this.renderer.render(this.scene, this.camera)
  }
}
