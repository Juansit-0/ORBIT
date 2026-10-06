export interface Rankable {
  label: string
  keywords?: string
}

export function scoreCommand(query: string, item: Rankable): number {
  const needle = query.trim().toLowerCase()
  if (!needle) return 1
  const haystack = `${item.label} ${item.keywords ?? ''}`.toLowerCase()
  const label = item.label.toLowerCase()
  if (label.startsWith(needle)) return 100 - label.length / 100
  if (label.split(/\s+/).some((word) => word.startsWith(needle))) return 80
  if (haystack.includes(needle)) return 60
  const tokens = needle.split(/\s+/).filter(Boolean)
  if (tokens.length > 1 && tokens.every((token) => haystack.includes(token))) return 40
  if (needle.length < 3) return 0
  let position = 0
  for (const char of needle) {
    position = label.indexOf(char, position)
    if (position === -1) return 0
    position += 1
  }
  return 10
}

export function rankCommands<T extends Rankable>(query: string, items: T[], limit: number): T[] {
  return items
    .map((item, index) => ({ item, index, score: scoreCommand(query, item) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.item)
}

export function groupTogether<T>(items: T[], groupOf: (item: T) => string): T[] {
  const order: string[] = []
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const group = groupOf(item)
    if (!buckets.has(group)) {
      buckets.set(group, [])
      order.push(group)
    }
    buckets.get(group)!.push(item)
  }
  return order.flatMap((group) => buckets.get(group) ?? [])
}
