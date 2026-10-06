let sequence = 0

export function createNodeId(): string {
  sequence += 1
  return `n${Date.now().toString(36)}${sequence.toString(36)}`
}

export class ListNode<T> {
  readonly id: string
  value: T
  prev: ListNode<T> | null = null
  next: ListNode<T> | null = null

  constructor(value: T, id: string = createNodeId()) {
    this.value = value
    this.id = id
  }
}
