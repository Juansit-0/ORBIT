export interface Entry {
  id: string
  title: string
}

export type Operation =
  | { kind: 'insert'; node: Entry; index: number; prev: Entry | null; next: Entry | null; size: number }
  | { kind: 'remove'; node: Entry; index: number; prev: Entry | null; next: Entry | null; size: number }
  | { kind: 'move'; node: Entry; from: number; to: number; size: number }

export interface Step {
  text: string
  link?: { left: string | null; right: string | null; arrow: 'next' | 'prev' }
  tag?: 'head' | 'tail'
  node?: string
}

export function diffOrder(before: Entry[], after: Entry[]): Operation | null {
  if (after.length === before.length + 1) {
    const known = new Set(before.map((entry) => entry.id))
    const index = after.findIndex((entry) => !known.has(entry.id))
    if (index === -1) return null
    return { kind: 'insert', node: after[index]!, index, prev: after[index - 1] ?? null, next: after[index + 1] ?? null, size: after.length }
  }
  if (after.length === before.length - 1) {
    const kept = new Set(after.map((entry) => entry.id))
    const index = before.findIndex((entry) => !kept.has(entry.id))
    if (index === -1) return null
    return { kind: 'remove', node: before[index]!, index, prev: before[index - 1] ?? null, next: before[index + 1] ?? null, size: before.length }
  }
  if (after.length !== before.length || after.length < 2) return null
  let first = 0
  while (first < after.length && after[first]!.id === before[first]!.id) first += 1
  if (first === after.length) return null
  let last = after.length - 1
  while (last > first && after[last]!.id === before[last]!.id) last -= 1
  if (before[first]!.id === after[last]!.id) return { kind: 'move', node: before[first]!, from: first, to: last, size: after.length }
  if (before[last]!.id === after[first]!.id) return { kind: 'move', node: before[last]!, from: last, to: first, size: after.length }
  return null
}

function name(entry: Entry | null): string {
  return entry ? `“${entry.title}”` : 'null'
}

export function walkCost(index: number, size: number): string {
  if (index === 0) return 'O(1) at the head'
  if (index >= size - 1) return 'O(1) at the tail'
  const fromHead = index
  const fromTail = size - 1 - index
  return fromHead <= fromTail ? `O(n): walked ${fromHead} node${fromHead === 1 ? '' : 's'} from HEAD` : `O(n): walked ${fromTail} node${fromTail === 1 ? '' : 's'} from TAIL`
}

export function explainOperation(operation: Operation): Step[] {
  if (operation.kind === 'insert') {
    const { node, prev, next, index, size } = operation
    return [
      { text: `insertAt(${index}) · ${walkCost(index, size)}`, node: node.id },
      { text: `new.prev = ${name(prev)}`, link: { left: prev?.id ?? null, right: node.id, arrow: 'prev' }, node: node.id },
      { text: `new.next = ${name(next)}`, link: { left: node.id, right: next?.id ?? null, arrow: 'next' }, node: node.id },
      prev
        ? { text: `${name(prev)}.next = new`, link: { left: prev.id, right: node.id, arrow: 'next' } }
        : { text: 'head = new', tag: 'head', node: node.id },
      next
        ? { text: `${name(next)}.prev = new`, link: { left: node.id, right: next.id, arrow: 'prev' } }
        : { text: 'tail = new', tag: 'tail', node: node.id },
    ]
  }
  if (operation.kind === 'remove') {
    const { node, prev, next, index, size } = operation
    return [
      { text: `remove(${name(node)}) · ${walkCost(index, size)}` },
      prev
        ? { text: `${name(prev)}.next = ${name(next)}`, link: { left: prev.id, right: next?.id ?? null, arrow: 'next' } }
        : { text: `head = ${name(next)}`, tag: 'head' },
      next
        ? { text: `${name(next)}.prev = ${name(prev)}`, link: { left: prev?.id ?? null, right: next.id, arrow: 'prev' } }
        : { text: `tail = ${name(prev)}`, tag: 'tail' },
      { text: `${name(node)}.prev = ${name(node)}.next = null` },
    ]
  }
  const { node, from, to } = operation
  return [
    { text: `move(${from} → ${to}) · unlink ${name(node)}, then relink it`, node: node.id },
    { text: 'its old neighbours now point to each other' },
    { text: `${name(node)} is linked again at index ${to}`, node: node.id },
  ]
}
