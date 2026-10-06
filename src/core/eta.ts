import type { RepeatMode } from './types.ts'

export interface EtaStop {
  id: string
  durationMs: number
  unavailable?: boolean
}

export interface EtaInput {
  order: EtaStop[]
  currentId: string | null
  positionMs: number
  currentDurationMs: number
  now: number
  repeat: RepeatMode
  looseRemainingMs?: number | undefined
}

export interface EtaResult {
  starts: Map<string, number>
  landsAt: number | null
}

export function etaFor(input: EtaInput): EtaResult {
  const starts = new Map<string, number>()
  const index = input.order.findIndex((stop) => stop.id === input.currentId)
  if (index === -1 || input.repeat === 'one') return { starts, landsAt: null }
  let clock = input.now
  let from = index + 1
  if (input.looseRemainingMs !== undefined) {
    clock += Math.max(0, input.looseRemainingMs)
    from = index
  } else {
    const current = input.order[index] as EtaStop
    const length = input.currentDurationMs > 0 ? input.currentDurationMs : current.durationMs
    clock += Math.max(0, length - input.positionMs)
  }
  for (const stop of input.order.slice(from)) {
    if (stop.unavailable) continue
    starts.set(stop.id, clock)
    clock += Math.max(0, stop.durationMs)
  }
  return { starts, landsAt: input.repeat === 'all' ? null : clock }
}

export function formatClock(time: number, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(time)
}
