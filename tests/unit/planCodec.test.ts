import { describe, expect, it } from 'vitest'
import { decodePlan, encodePlan, exportPlan, MAX_SHARED, parseImport } from '../../src/services/planCodec.ts'
import { song } from './helpers.ts'

const songs = ['111', '222', '333'].map((id) => ({ ...song(id), title: `Canción ${id} é`, artworkUrl: 'https://a/b.jpg' }))

describe('share links', () => {
  it('round trips the name and song ids, including accents', () => {
    const encoded = encodePlan('Música para clase', songs)
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodePlan(encoded)).toEqual({ name: 'Música para clase', ids: ['111', '222', '333'] })
  })

  it('drops ids that are not iTunes ids and caps the length', () => {
    const many = Array.from({ length: 200 }, (_, i) => song(String(1000 + i)))
    expect(decodePlan(encodePlan('Big', [...many, song('not-an-id')]))?.ids).toHaveLength(MAX_SHARED)
  })

  it('rejects broken or empty links', () => {
    expect(decodePlan('not base64 at all!!')).toBeNull()
    expect(decodePlan(encodePlan('Empty', []))).toBeNull()
    expect(decodePlan(btoa(JSON.stringify({ n: 'x', i: 5 })))).toBeNull()
  })
})

describe('export and import', () => {
  it('round trips a playlist through the file format', () => {
    const imported = parseImport(exportPlan('Road trip', songs))
    expect(imported?.name).toBe('Road trip')
    expect(imported?.songs.map((s) => s.id)).toEqual(['111', '222', '333'])
  })

  it('cleans unsafe or broken entries', () => {
    const text = JSON.stringify({
      app: 'orbit',
      name: '  ',
      songs: [
        { id: '1', title: 'Ok', artist: 'A', artworkUrl: 'javascript:alert(1)', durationMs: -5, previewUrl: 'http://insecure' },
        { title: 'No id' },
        42,
      ],
    })
    const imported = parseImport(text)
    expect(imported?.name).toBe('Imported playlist')
    expect(imported?.songs).toEqual([{ id: '1', title: 'Ok', artist: 'A', album: '', artworkUrl: '', durationMs: 0 }])
  })

  it('rejects files that are not Orbit playlists', () => {
    expect(parseImport('{}')).toBeNull()
    expect(parseImport('nope')).toBeNull()
    expect(parseImport(JSON.stringify({ app: 'orbit', songs: [] }))).toBeNull()
  })
})
