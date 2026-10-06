import { DoublyLinkedList } from './DoublyLinkedList.ts'

export interface Command {
  readonly label: string
  execute(): void | Promise<void>
  revert(): void | Promise<void>
}

export type HistoryListener = (history: CommandHistory) => void

export class CommandHistory {
  private readonly done = new DoublyLinkedList<Command>()
  private readonly undone = new DoublyLinkedList<Command>()
  private readonly listeners = new Set<HistoryListener>()
  private readonly limit: number
  private queue: Promise<unknown> = Promise.resolve()

  constructor(limit = 50) {
    this.limit = limit
  }

  get canUndo(): boolean {
    return !this.done.isEmpty()
  }

  get canRedo(): boolean {
    return !this.undone.isEmpty()
  }

  get undoLabel(): string | null {
    return this.done.tail?.value.label ?? null
  }

  get redoLabel(): string | null {
    return this.undone.tail?.value.label ?? null
  }

  get size(): number {
    return this.done.size
  }

  subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  run(command: Command): Promise<void> {
    return this.enqueue(async () => {
      await command.execute()
      this.record(command)
    })
  }

  record(command: Command): void {
    this.done.addLast(command)
    if (this.done.size > this.limit) this.done.removeFirst()
    this.undone.clear()
    this.emit()
  }

  undo(): Promise<Command | null> {
    return this.enqueue(async () => {
      const command = this.done.removeLast()
      if (!command) return null
      try {
        await command.revert()
        this.undone.addLast(command)
      } finally {
        this.emit()
      }
      return command
    })
  }

  redo(): Promise<Command | null> {
    return this.enqueue(async () => {
      const command = this.undone.removeLast()
      if (!command) return null
      try {
        await command.execute()
        this.done.addLast(command)
      } finally {
        this.emit()
      }
      return command
    })
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task)
    this.queue = next.catch(() => undefined)
    return next
  }

  clear(): void {
    this.done.clear()
    this.undone.clear()
    this.emit()
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this)
  }
}
