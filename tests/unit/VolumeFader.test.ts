import { describe, expect, it } from 'vitest'
import { easeInOut, VolumeFader, type FaderClock } from '../../src/player/VolumeFader.ts'

function manualClock(): FaderClock & { advance: (ms: number) => void } {
  let time = 0
  const queue = new Map<number, () => void>()
  let id = 0
  return {
    now: () => time,
    schedule: (callback) => {
      id += 1
      queue.set(id, callback)
      return id
    },
    cancel: (handle) => queue.delete(handle),
    advance(ms) {
      const end = time + ms
      while (time < end) {
        time = Math.min(end, time + 16)
        const pending = [...queue.entries()]
        queue.clear()
        for (const [, callback] of pending) callback()
      }
    },
  }
}

describe('easeInOut', () => {
  it('starts slow, ends slow and stays in range', () => {
    expect(easeInOut(0)).toBe(0)
    expect(easeInOut(1)).toBe(1)
    expect(easeInOut(0.5)).toBe(0.5)
    expect(easeInOut(-1)).toBe(0)
    expect(easeInOut(0.1)).toBeLessThan(0.1)
  })
})

describe('VolumeFader', () => {
  it('ramps down and resolves when done', async () => {
    const clock = manualClock()
    const fader = new VolumeFader(clock)
    const values: number[] = []
    const done = fader.fadeOut({ setVolume: (v) => values.push(v) }, 80, 300)
    expect(fader.running).toBe(true)
    clock.advance(320)
    await done
    expect(values[0]).toBe(80)
    expect(values.at(-1)).toBe(0)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    expect(fader.running).toBe(false)
  })

  it('ramps up to the target volume', async () => {
    const clock = manualClock()
    const fader = new VolumeFader(clock)
    let volume = -1
    const done = fader.fadeIn({ setVolume: (v) => (volume = v) }, 65, 450)
    clock.advance(200)
    expect(volume).toBeGreaterThan(0)
    expect(volume).toBeLessThan(65)
    clock.advance(300)
    await done
    expect(volume).toBe(65)
  })

  it('cancelling stops the ramp and settles the promise', async () => {
    const clock = manualClock()
    const fader = new VolumeFader(clock)
    const values: number[] = []
    const done = fader.fadeOut({ setVolume: (v) => values.push(v) }, 80, 300)
    clock.advance(100)
    fader.cancel()
    await done
    const count = values.length
    clock.advance(300)
    expect(values.length).toBe(count)
  })

  it('a new ramp replaces the previous one', async () => {
    const clock = manualClock()
    const fader = new VolumeFader(clock)
    let volume = 0
    const first = fader.fadeOut({ setVolume: (v) => (volume = v) }, 80, 300)
    clock.advance(50)
    const second = fader.fadeIn({ setVolume: (v) => (volume = v) }, 40, 100)
    await first
    clock.advance(120)
    await second
    expect(volume).toBe(40)
  })
})
