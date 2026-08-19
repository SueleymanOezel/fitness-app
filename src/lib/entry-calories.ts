import type { FoodEntry } from '../hooks/use-food-entries'

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryKalorien(entry: FoodEntry): number {
  if (!entry.products) return 0
  return (entry.products.kalorien * entry.menge) / 100
}

export function sumKalorien(entries: FoodEntry[]): number {
  return entries.reduce((total, entry) => total + entryKalorien(entry), 0)
}
