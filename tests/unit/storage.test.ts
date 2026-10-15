import { afterEach, describe, expect, it } from 'vitest'
import { loadPlaylist } from '../../src/services/storage.ts'
import { song } from './helpers.ts'

function fakeStorage(values: Record<string, string>) {
  return {
    getItem: (key: string) => values[key] ?? null,
    setItem: (key: string, value: string) => void (values[key] = value),
    removeItem: (key: string) => void delete values[key],
  }
}

describe('loadPlaylist', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('restores a saved flight plan', () => {
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage({ 'orbit:v1:playlist': JSON.stringify({ songs: [song('a')], currentIndex: 0, repeat: 'off', shuffle: false }) }), configurable: true })
    expect(loadPlaylist()?.songs.map((entry) => entry.id)).toEqual(['a'])
  })

  it('ignores a saved plan with songs missing their artist or length', () => {
    const broken = { songs: [{ id: 'a', title: 'A' }], currentIndex: 0, repeat: 'off', shuffle: true }
    Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage({ 'orbit:v1:playlist': JSON.stringify(broken) }), configurable: true })
    expect(loadPlaylist()).toBeNull()
  })
})
