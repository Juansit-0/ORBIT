import { buildProfile } from './analysis.ts'

self.addEventListener('message', (event: MessageEvent<{ id: string; samples: Float32Array; rate: number }>) => {
  const { id, samples, rate } = event.data
  const profile = buildProfile(samples, rate)
  self.postMessage({ id, profile }, { transfer: [profile.bass.buffer, profile.mid.buffer, profile.treble.buffer] })
})
