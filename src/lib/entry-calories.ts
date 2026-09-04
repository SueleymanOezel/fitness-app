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

/** Wie `KalorienEintrag`, aber fuer die drei Makros statt fuer Kalorien. */
export type MakroEintrag = {
  menge: number
  products: { eiweiss: number | null; fett: number | null; kohlenhydrate: number | null } | null
}

/** Nutritional values are stored per 100 g; an entry stores its amount in grams. */
export function entryMakro(entry: MakroEintrag, makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  const value = entry.products?.[makro]
  if (value == null) return 0
  return (value * entry.menge) / 100
}

export function sumMakro(entries: MakroEintrag[], makro: 'eiweiss' | 'fett' | 'kohlenhydrate'): number {
  return entries.reduce((total, entry) => total + entryMakro(entry, makro), 0)
}
