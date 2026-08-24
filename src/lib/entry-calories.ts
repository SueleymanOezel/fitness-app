import type { FoodEntry } from '../hooks/use-food-entries'

/**
 * The structural minimum a calorie calculation needs. Stated as its own type so
 * an analysis query can select two columns instead of the whole entry shape;
 * `FoodEntry` satisfies it.
 */
export type KalorienEintrag = { menge: number; products: { kalorien: number } | null }

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryKalorien(entry: KalorienEintrag): number {
  if (!entry.products) return 0
  return (entry.products.kalorien * entry.menge) / 100
}

export function sumKalorien(entries: FoodEntry[]): number {
  return entries.reduce((total, entry) => total + entryKalorien(entry), 0)
}
