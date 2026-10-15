import { describe, expect, it, vi } from 'vitest'
import { BoundedCache } from '../../api/_lib/boundedCache.ts'
import { clearResolveCache, resolveVideo } from '../../api/_lib/handlers.ts'

describe('BoundedCache', () => {
  it('drops the least recently used entry past its limit', () => {
    const cache = new BoundedCache<string, number>(2)
    cache.set('a', 1)
    cache.set('b', 2)
    expect(cache.get('a')).toBe(1)
    cache.set('c', 3)
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe(1)
    expect(cache.size).toBe(2)
  })
})

describe('input limits', () => {
  it('refuses very long titles before spending any YouTube quota', async () => {
    clearResolveCache()
    const fetcher = vi.fn()
    const result = await resolveVideo({ title: 'x'.repeat(201), artist: 'Daft Punk', durationMs: 1000 }, 'key', fetcher)
    expect(result.status).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
