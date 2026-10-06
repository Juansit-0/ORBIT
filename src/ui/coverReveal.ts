export interface RevealInput {
  hasSong: boolean
  playing: boolean
  hovering: boolean
  now: number
  holdUntil: number
  reducedMotion: boolean
}

export const START_HOLD_MS = 2000

export function coverShown(input: RevealInput): boolean {
  if (!input.hasSong || input.reducedMotion) return true
  if (!input.playing || input.hovering) return true
  return input.now < input.holdUntil
}
