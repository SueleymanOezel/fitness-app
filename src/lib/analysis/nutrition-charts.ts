import { entryKalorien } from '../entry-calories'
import { localDay } from '../local-time'

export type TagesPunkt = { tag: string; kalorien: number }

/**
 * Calories per local day, oldest first.
 *
 * Days without entries are left out rather than filled with zero: no entry
 * means "not logged", and a zero bar would read as a fasting day.
 */
export function kalorienJeTag(
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[],
): TagesPunkt[] {
  const summeJeTag = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.products) continue
    const tag = localDay(entry.zeitpunkt)
    summeJeTag.set(tag, (summeJeTag.get(tag) ?? 0) + entryKalorien(entry))
  }
  return [...summeJeTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, kalorien]) => ({ tag, kalorien: Math.round(kalorien) }))
}
