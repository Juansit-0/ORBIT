import type { Song } from '../core/types.ts'
import { searchSongs } from '../services/searchService.ts'
import { showToast } from '../ui/components/toast.ts'
import { quoted } from '../ui/format.ts'
import type { PlayerApp } from './PlayerApp.ts'
import { pickRadioSongs, primaryArtist, radioKey } from './radioPick.ts'

type RadioListener = (radio: Radio) => void

export class Radio {
  private readonly app: PlayerApp
  private readonly enabled: () => boolean
  private readonly listeners = new Set<RadioListener>()
  private queue: Song[] = []
  private readonly played = new Set<string>()
  private currentId: string | null = null
  private seed: Song | null = null
  private activeState = false
  private busy = false
  private lastOffer: { id: string; until: number } | null = null

  constructor(app: PlayerApp, enabled: () => boolean) {
    this.app = app
    this.enabled = enabled
    app.playback.onPlanEnd((last) => {
      if (last && this.enabled() && !this.activeState) this.offer(last)
    })
    app.playback.onLooseEnd((song) => {
      if (this.activeState && song.id === this.currentId) void this.playNext()
    })
    app.playback.onNotice((notice) => {
      if (this.activeState && notice.type === 'unavailable' && notice.song.id === this.currentId) void this.playNext()
    })
    app.playback.subscribe((state) => {
      if (!this.activeState || this.busy) return
      if (state.song && state.song.id !== this.currentId) this.stop(false)
    })
  }

  get active(): boolean {
    return this.activeState
  }

  onChange(listener: RadioListener): void {
    this.listeners.add(listener)
  }

  offer(last: Song): void {
    const now = performance.now()
    if (this.lastOffer && this.lastOffer.id === last.id && now < this.lastOffer.until) return
    this.lastOffer = { id: last.id, until: now + 10000 }
    showToast({
      tone: 'info',
      title: 'You reached the end of the flight plan',
      detail: `Keep the music going with songs like ${quoted(last.title)}.`,
      duration: 10000,
      action: { label: 'Start radio', run: () => void this.start(last) },
    })
  }

  async start(seed: Song): Promise<void> {
    this.lastOffer = null
    this.seed = seed
    this.queue = []
    this.played.clear()
    this.played.add(radioKey(seed))
    this.activeState = true
    this.emit()
    await this.playNext()
    if (this.activeState) showToast({ tone: 'success', title: 'Radio on', detail: `Songs like ${quoted(seed.title)}. They are not added to your flight plan.` })
  }

  stop(announce = true): void {
    if (!this.activeState) return
    this.activeState = false
    this.queue = []
    this.currentId = null
    this.emit()
    if (announce) showToast({ tone: 'info', title: 'Radio off' })
  }

  private async playNext(): Promise<void> {
    this.busy = true
    try {
      if (this.queue.length === 0) await this.refill()
      const next = this.queue.shift()
      if (!next || !this.activeState) {
        if (this.activeState) showToast({ tone: 'info', title: 'The radio ran out of songs', detail: 'Search for something new to keep going.' })
        this.stop(false)
        return
      }
      this.played.add(radioKey(next))
      this.currentId = next.id
      this.seed = next
      await this.app.playNow(next)
    } finally {
      this.busy = false
    }
  }

  private async refill(): Promise<void> {
    const seed = this.seed
    if (!seed) return
    const terms = [primaryArtist(seed.artist), seed.genre ? `${seed.genre} hits` : null].filter((term): term is string => Boolean(term))
    const pools = await Promise.all(terms.map((term) => searchSongs(term).catch(() => [] as Song[])))
    const plan = this.app.playlist.list.toArray()
    this.queue = pickRadioSongs(
      pools,
      { ids: new Set([seed.id, ...plan.map((song) => song.id)]), keys: new Set([...this.played, ...plan.map(radioKey)]) },
      10,
    )
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this)
  }
}
