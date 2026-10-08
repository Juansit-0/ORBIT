import { describe, expect, it } from 'vitest'
import { isProvider, services } from '../../src/services/provider.ts'

describe('services', () => {
  it('lists every service with YouTube first and Apple and Deezer as coming soon', () => {
    const list = services(false)
    expect(list.map((service) => service.id)).toEqual(['youtube', 'youtubeMusic', 'spotify', 'apple', 'deezer'])
    expect(list.find((service) => service.id === 'apple')?.status).toBe('soon')
    expect(list.find((service) => service.id === 'deezer')?.status).toBe('soon')
  })

  it('marks Spotify ready only when it is set up', () => {
    expect(services(false).find((service) => service.id === 'spotify')?.status).toBe('setup')
    expect(services(true).find((service) => service.id === 'spotify')?.status).toBe('ready')
  })

  it('recognises playable providers', () => {
    expect(isProvider('youtubeMusic')).toBe(true)
    expect(isProvider('apple')).toBe(false)
    expect(isProvider(null)).toBe(false)
  })
})
