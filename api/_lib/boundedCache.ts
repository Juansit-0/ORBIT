export class BoundedCache<K, V> {
  private readonly entries = new Map<K, V>()
  private readonly limit: number

  constructor(limit: number) {
    this.limit = limit
  }

  get size(): number {
    return this.entries.size
  }

  get(key: K): V | undefined {
    const value = this.entries.get(key)
    if (value === undefined) return undefined
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: K, value: V): void {
    this.entries.delete(key)
    this.entries.set(key, value)
    while (this.entries.size > this.limit) {
      const oldest = this.entries.keys().next().value as K
      this.entries.delete(oldest)
    }
  }

  clear(): void {
    this.entries.clear()
  }
}
