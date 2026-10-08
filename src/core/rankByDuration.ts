export interface Timed {
  id: string
  durationMs: number
}

export function pickClosest(candidates: readonly Timed[], targetMs: number): string | null {
  if (candidates.length === 0) return null
  if (targetMs <= 0) return candidates[0]?.id ?? null
  const ranked = [...candidates].sort((a, b) => Math.abs(a.durationMs - targetMs) - Math.abs(b.durationMs - targetMs))
  const best = ranked[0]
  if (best && Math.abs(best.durationMs - targetMs) <= Math.max(20000, targetMs * 0.15)) return best.id
  return candidates[0]?.id ?? null
}

export function rankByDuration(candidates: readonly Timed[], targetMs: number): string[] {
  const best = pickClosest(candidates, targetMs)
  if (!best) return []
  const rest = candidates
    .filter((candidate) => candidate.id !== best)
    .sort((a, b) => (targetMs > 0 ? Math.abs(a.durationMs - targetMs) - Math.abs(b.durationMs - targetMs) : 0))
    .map((candidate) => candidate.id)
  return [best, ...rest]
}
