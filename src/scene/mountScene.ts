import type { PlaybackController } from '../player/PlaybackController.ts'
import type { Playlist } from '../core/Playlist.ts'

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function firstVisit(): boolean {
  try {
    const first = localStorage.getItem('orbit:v1:intro') !== 'seen'
    localStorage.setItem('orbit:v1:intro', 'seen')
    return first
  } catch {
    return false
  }
}

export function mountScene(
  anchor: HTMLElement,
  playlist: Playlist,
  playback: PlaybackController,
  onReady: (scene: { setCoverShown(shown: boolean): void }) => void,
): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (reduced.matches || !webglAvailable() || import.meta.env.VITE_PLAYER === 'fake') return
  const start = () => {
    void import('./OrbitScene.ts').then(({ OrbitScene }) => {
      const canvas = document.createElement('canvas')
      canvas.className = 'scene'
      canvas.setAttribute('aria-hidden', 'true')
      document.body.prepend(canvas)
      const small = window.matchMedia('(max-width: 920px)').matches
      const intro = firstVisit()
      const cores = navigator.hardwareConcurrency || 4
      const scene = new OrbitScene({
        canvas,
        anchor,
        particleCount: small ? (cores <= 4 ? 3500 : 6000) : cores <= 4 ? 9000 : 15000,
        intro,
      })
      const sync = () => {
        const state = playback.state
        const node = state.nodeId ? playlist.list.findById(state.nodeId) : null
        scene.setPlayback({
          playing: state.status === 'playing',
          trackKey: node?.value.id ?? null,
          positionMs: state.currentMs,
          artworkUrl: node?.value.artworkUrl ?? null,
        })
      }
      playback.subscribe(sync)
      document.documentElement.classList.add('has-scene')
      onReady(scene)
      requestAnimationFrame(() => canvas.classList.add('scene--ready'))
      reduced.addEventListener('change', (event) => {
        if (event.matches) {
          scene.dispose()
          canvas.remove()
          document.documentElement.classList.remove('has-scene')
        }
      })
    })
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 1200 })
  else setTimeout(start, 300)
}
