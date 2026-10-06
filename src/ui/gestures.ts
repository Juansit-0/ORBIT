export type Swipe = 'left' | 'right' | null

export function classifySwipe(dx: number, dy: number, ms: number): Swipe {
  const distance = Math.abs(dx)
  if (distance < 56 || distance < Math.abs(dy) * 1.6) return null
  const velocity = distance / Math.max(1, ms)
  if (ms > 900 && velocity < 0.12) return null
  return dx < 0 ? 'left' : 'right'
}

export function isLongPress(ms: number, moved: number): boolean {
  return ms >= 480 && moved < 10
}
