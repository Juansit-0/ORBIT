import { describe, expect, it, vi } from 'vitest'
import { Playlist } from '../../src/core/Playlist.ts'
import { announcement, DjVoice, type Speaker } from '../../src/player/DjVoice.ts'
import type { PlaybackController, PlaybackState } from '../../src/player/PlaybackController.ts'
import { song } from './helpers.ts'

const next = { ...song('b'), title: 'Blinding Lights', artist: 'The Weeknd' }

describe('announcement', () => {
  it('names the next song', () => {
    expect(announcement(next, 5, 0)).toBe('Up next, Blinding Lights by The Weeknd.')
  })

  it('marks the last song and counts down near the end', () => {
    expect(announcement(next, 0, 0)).toBe('Up next, Blinding Lights by The Weeknd. Last song of the flight plan.')
    expect(announcement(next, 2, 2)).toBe('Up next, Blinding Lights by The Weeknd. Two songs left before landing.')
    expect(announcement(next, 1, 5)).toBe('Up next, Blinding Lights by The Weeknd. One song left before landing.')
    expect(announcement(next, 2, 1)).toBe('Up next, Blinding Lights by The Weeknd.')
  })
})

describe('DjVoice', () => {
  function setup(enabled: boolean) {
    let listener: (state: PlaybackState) => void = () => {}
    const playback = {
      subscribe: (callback: (state: PlaybackState) => void) => {
        listener = callback
        return () => undefined
      },
    } as unknown as PlaybackController
    const playlist = new Playlist()
    for (const id of ['a', 'b', 'c']) playlist.addLast(song(id))
    playlist.next()
    const speaker: Speaker = { speak: vi.fn(), cancel: vi.fn() }
    const voice = new DjVoice(playback, playlist, speaker, enabled)
    const emit = (mixing: boolean) => listener({ mixing } as PlaybackState)
    return { voice, speaker, emit }
  }

  it('speaks once when a mix starts', () => {
    const { speaker, emit } = setup(true)
    emit(false)
    emit(true)
    emit(true)
    emit(false)
    expect(speaker.speak).toHaveBeenCalledTimes(1)
    expect(speaker.speak).toHaveBeenCalledWith('Up next, Title b by Artist b.')
  })

  it('stays silent while off and stops talking when turned off', () => {
    const { voice, speaker, emit } = setup(false)
    emit(true)
    expect(speaker.speak).not.toHaveBeenCalled()
    voice.setEnabled(true)
    voice.setEnabled(false)
    expect(speaker.cancel).toHaveBeenCalled()
  })
})
