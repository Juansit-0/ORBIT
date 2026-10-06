export interface IdleInput {
  now: number
  playing: boolean
  delayMs: number | null
  blocked: boolean
}

export class IdleClock {
  private lastActivity: number
  private graceUntil = 0

  constructor(now: number) {
    this.lastActivity = now
  }

  activity(now: number): boolean {
    if (now < this.graceUntil) return false
    this.lastActivity = now
    return true
  }

  grace(now: number, ms: number): void {
    this.lastActivity = now
    this.graceUntil = now + ms
  }

  shouldEnter(input: IdleInput): boolean {
    if (!input.playing || input.blocked || input.delayMs === null) return false
    return input.now - this.lastActivity >= input.delayMs
  }

  remaining(input: IdleInput): number | null {
    if (!input.playing || input.blocked || input.delayMs === null) return null
    return Math.max(0, input.delayMs - (input.now - this.lastActivity))
  }
}
