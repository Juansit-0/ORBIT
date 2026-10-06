import { describe, expect, it } from 'vitest'
import { pickRadioSongs, primaryArtist, radioKey } from '../../src/app/radioPick.ts'
import { song } from './helpers.ts'

const s = (id: string, title: string, artist: string) => ({ ...song(id), title, artist })

describe('primaryArtist', () => {
  it('keeps the first credited artist', () => {
    expect(primaryArtist('Daft Punk, Pharrell Williams & Nile Rodgers')).toBe('Daft Punk')
    expect(primaryArtist('Calvin Harris feat. Rihanna')).toBe('Calvin Harris')
    expect(primaryArtist('Queen')).toBe('Queen')
  })
})

describe('pickRadioSongs', () => {
  it('alternates pools and skips excluded or repeated songs', () => {
    const byArtist = [s('1', 'One', 'A'), s('2', 'Two', 'A'), s('3', 'Three', 'A')]
    const byGenre = [s('9', 'Nine', 'B'), s('2', 'Two', 'A'), s('8', 'Two (Remastered)', 'A feat. C')]
    const exclude = { ids: new Set(['1']), keys: new Set([radioKey(s('x', 'Nine', 'B'))]) }
    expect(pickRadioSongs([byArtist, byGenre], exclude, 10).map((song) => song.id)).toEqual(['2', '3'])
  })

  it('honours the limit and handles empty pools', () => {
    expect(pickRadioSongs([[s('1', 'One', 'A'), s('2', 'Two', 'A')]], { ids: new Set(), keys: new Set() }, 1)).toHaveLength(1)
    expect(pickRadioSongs([], { ids: new Set(), keys: new Set() }, 5)).toEqual([])
  })
})
