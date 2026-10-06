import { describe, expect, it, vi } from 'vitest'
import { CommandHistory, type Command } from '../../src/core/CommandHistory.ts'

function counter(): { value: number; command: (label: string, step: number) => Command } {
  const state = { value: 0 }
  return {
    get value() {
      return state.value
    },
    command: (label, step) => ({
      label,
      execute: () => {
        state.value += step
      },
      revert: () => {
        state.value -= step
      },
    }),
  }
}

describe('CommandHistory', () => {
  it('runs, undoes and redoes in order', async () => {
    const c = counter()
    const history = new CommandHistory()
    await history.run(c.command('one', 1))
    await history.run(c.command('ten', 10))
    expect(c.value).toBe(11)
    expect(history.undoLabel).toBe('ten')
    expect((await history.undo())?.label).toBe('ten')
    expect(c.value).toBe(1)
    expect(history.redoLabel).toBe('ten')
    await history.undo()
    expect(c.value).toBe(0)
    expect(history.canUndo).toBe(false)
    expect(await history.undo()).toBeNull()
    await history.redo()
    await history.redo()
    expect(c.value).toBe(11)
    expect(history.canRedo).toBe(false)
    expect(await history.redo()).toBeNull()
  })

  it('drops the redo branch when a new command runs', async () => {
    const c = counter()
    const history = new CommandHistory()
    await history.run(c.command('a', 1))
    await history.undo()
    await history.run(c.command('b', 5))
    expect(history.canRedo).toBe(false)
    expect(c.value).toBe(5)
  })

  it('keeps only the most recent commands', async () => {
    const c = counter()
    const history = new CommandHistory(3)
    for (let i = 0; i < 5; i++) await history.run(c.command(`c${i}`, 1))
    expect(history.size).toBe(3)
    while (await history.undo());
    expect(c.value).toBe(2)
  })

  it('notifies listeners and clears', async () => {
    const c = counter()
    const history = new CommandHistory()
    const listener = vi.fn()
    history.subscribe(listener)
    await history.run(c.command('a', 1))
    history.clear()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(history.canUndo).toBe(false)
  })

  it('queues rapid undo calls instead of dropping them', async () => {
    const history = new CommandHistory()
    const order: string[] = []
    let release: () => void = () => {}
    history.record({ label: 'first', execute: () => {}, revert: () => void order.push('first') })
    history.record({
      label: 'slow',
      execute: () => {},
      revert: () => new Promise<void>((resolve) => (release = () => {
        order.push('slow')
        resolve()
      })),
    })
    const a = history.undo()
    const b = history.undo()
    const c = history.undo()
    await Promise.resolve()
    release()
    expect((await a)?.label).toBe('slow')
    expect((await b)?.label).toBe('first')
    expect(await c).toBeNull()
    expect(order).toEqual(['slow', 'first'])
  })

  it('keeps working after a command throws', async () => {
    const history = new CommandHistory()
    await expect(history.run({ label: 'bad', execute: () => { throw new Error('x') }, revert: () => {} })).rejects.toThrow('x')
    expect(history.canUndo).toBe(false)
    await history.run({ label: 'ok', execute: () => {}, revert: () => {} })
    expect(history.undoLabel).toBe('ok')
  })
})
