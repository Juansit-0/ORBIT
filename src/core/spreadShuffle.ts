export interface SpreadOptions<T> {
  artistOf: (item: T) => string
  genreOf?: (item: T) => string | undefined
  random?: () => number
  after?: T | null
}

export function fisherYates<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = result[i] as T
    result[i] = result[j] as T
    result[j] = swap
  }
  return result
}

export function spreadShuffle<T>(items: readonly T[], options: SpreadOptions<T>): T[] {
  const { artistOf, genreOf = () => undefined, random = Math.random, after = null } = options
  const pool = fisherYates(items, random)
  const counts = new Map<string, number>()
  for (const item of pool) counts.set(artistOf(item), (counts.get(artistOf(item)) ?? 0) + 1)
  const result: T[] = []
  let previous: T | null = after
  while (pool.length > 0) {
    const lastArtist = previous === null ? null : artistOf(previous)
    const lastGenre = previous === null ? undefined : genreOf(previous)
    let forced: string | null = null
    for (const [artist, count] of counts) {
      if (count * 2 > pool.length && artist !== lastArtist) forced = artist
    }
    let index: number
    if (forced !== null) {
      index = pool.findIndex((item) => artistOf(item) === forced)
    } else {
      index = pool.findIndex((item) => artistOf(item) !== lastArtist && (lastGenre === undefined || genreOf(item) !== lastGenre))
      if (index === -1) index = pool.findIndex((item) => artistOf(item) !== lastArtist)
      if (index === -1) index = 0
    }
    const [picked] = pool.splice(index, 1) as [T]
    const artist = artistOf(picked)
    const left = (counts.get(artist) ?? 1) - 1
    if (left === 0) counts.delete(artist)
    else counts.set(artist, left)
    result.push(picked)
    previous = picked
  }
  return result
}

export function insertionSlots<T>(order: readonly T[], from: number, item: T, artistOf: (item: T) => string): number[] {
  const artist = artistOf(item)
  const slots: number[] = []
  for (let index = from; index <= order.length; index++) {
    const before = order[index - 1]
    const after = order[index]
    const clashBefore = index > 0 && before !== undefined && artistOf(before) === artist
    const clashAfter = after !== undefined && artistOf(after) === artist
    if (!clashBefore && !clashAfter) slots.push(index)
  }
  return slots
}
