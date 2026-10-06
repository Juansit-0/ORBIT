import { AudioReactor } from '../audio/AudioReactor.ts'
import { showToast } from './components/toast.ts'
import { el } from './dom.ts'
import { icon } from './icons.ts'

const DESCRIPTIONS = {
  live: 'Reacting to live sound. Click to stop.',
  preview: 'Reacting to the preview audio. Click to react to live sound.',
  analysis: 'Reacting to the analysed rhythm of this song. Click to react to live sound.',
  none: 'React to live sound',
} as const

export function createLiveSoundChip(reactor: AudioReactor): HTMLButtonElement | null {
  if (!AudioReactor.liveSupported() || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return null
  const chip = el('button', {
    class: 'chip deck__chip deck__live',
    attrs: { type: 'button', 'aria-pressed': 'false' },
  }, [icon('wave'), el('span', { text: 'Live sound' })])
  const sync = () => {
    chip.setAttribute('aria-pressed', String(reactor.liveActive))
    chip.title = DESCRIPTIONS[reactor.source]
    chip.setAttribute('aria-label', DESCRIPTIONS[reactor.source])
  }
  chip.addEventListener('click', async () => {
    if (reactor.liveActive) {
      reactor.stopLive()
      showToast({ tone: 'info', title: 'Live sound off', detail: 'The planet follows the analysed rhythm again.' })
      return
    }
    chip.disabled = true
    const result = await reactor.startLive()
    chip.disabled = false
    const messages = {
      ok: { tone: 'success', title: 'Reacting to live sound', detail: 'The planet now follows exactly what you hear.' },
      denied: { tone: 'info', title: 'Live sound was not started', detail: 'Sharing was cancelled. The planet keeps following the analysed rhythm.' },
      'no-audio': { tone: 'error', title: 'No audio was shared', detail: 'Pick this tab and turn on “Share tab audio”.' },
      unsupported: { tone: 'info', title: 'Live sound is not available here', detail: 'It needs Chrome or Edge on a computer.' },
    } as const
    showToast(messages[result])
  })
  reactor.subscribe(sync)
  sync()
  return chip
}
