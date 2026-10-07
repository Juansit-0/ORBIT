import type { Playlist } from '../core/Playlist.ts'
import type { Song } from '../core/types.ts'
import type { PlaybackController } from './PlaybackController.ts'

export interface Speaker {
  speak(text: string): void
  cancel(): void
}

const LEFT = ['', 'One song', 'Two songs', 'Three songs']

export function announcement(next: Song, songsAfter: number, count: number): string {
  const lead = `Up next, ${next.title} by ${next.artist}.`
  if (songsAfter === 0) return `${lead} Last song of the flight plan.`
  if (count % 3 === 2 && songsAfter <= 3) return `${lead} ${LEFT[songsAfter]} left before landing.`
  return lead
}

export function browserSpeaker(): Speaker | null {
  const synth = globalThis.speechSynthesis
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return null
  return {
    speak(text) {
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 1.02
      const voice = synth.getVoices().find((candidate) => candidate.lang.startsWith('en'))
      if (voice) utterance.voice = voice
      synth.speak(utterance)
    },
    cancel() {
      synth.cancel()
    },
  }
}

export class DjVoice {
  private readonly speaker: Speaker
  private enabledState: boolean
  private wasMixing = false
  private count = 0

  constructor(playback: PlaybackController, playlist: Playlist, speaker: Speaker, enabled: boolean) {
    this.speaker = speaker
    this.enabledState = enabled
    playback.subscribe((state) => {
      const starting = state.mixing && !this.wasMixing
      this.wasMixing = state.mixing
      if (!starting || !this.enabledState) return
      const next = playlist.peekNext()
      if (!next) return
      const order = playlist.playOrder()
      const index = order.indexOf(next)
      const songsAfter = playlist.repeat === 'all' ? order.length : Math.max(0, order.length - index - 1)
      this.speaker.speak(announcement(next.value, songsAfter, this.count))
      this.count += 1
    })
  }

  get enabled(): boolean {
    return this.enabledState
  }

  setEnabled(enabled: boolean): void {
    this.enabledState = enabled
    if (!enabled) this.speaker.cancel()
  }
}
