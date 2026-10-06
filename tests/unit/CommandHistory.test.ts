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

  it('ignores reentrant undo while a revert is pending', async () => {
    const history = new CommandHistory()
    let release: () => void = () => {}
    history.record({ label: 'slow', execute: () => {}, revert: () => new Promise<void>((r) => (release = r)) })
    history.record({ label: 'fast', execute: () => {}, revert: () => {} })
    await history.undo()
    const pending = history.undo()
    expect(await history.undo()).toBeNull()
    release()
    expect((await pending)?.label).toBe('slow')
  })
})
