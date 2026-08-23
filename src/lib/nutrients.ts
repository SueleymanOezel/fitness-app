/** Everything except calories is measured in grams per 100 g and may be unknown. */
const GRAM_FIELDS = ['eiweiss', 'fett', 'kohlenhydrate', 'ballaststoffe', 'zucker', 'salz'] as const

type GramField = (typeof GRAM_FIELDS)[number]

export type Nutrients = { kalorien: number } & Record<GramField, number | null>

export type NutrientInput = Record<'kalorien' | GramField, string>

/**
 * products is a shared table — a typo'd -300 or 1e21 would poison everyone's
 * totals, so implausible values never reach the database. Empty grams stay null,
 * missing calories reject the whole set.
 */
export function parseNutrients(raw: NutrientInput): Nutrients | null {
  const parse = (value: string, max: number) => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined
  }

  const kalorien = parse(raw.kalorien, 900)
  if (kalorien == null) return null

  const grams = {} as Record<GramField, number | null>
  for (const field of GRAM_FIELDS) {
    const value = parse(raw[field], 100)
    // undefined means "given but implausible" — that rejects the whole set,
    // unlike null, which just means the user left the field empty.
    if (value === undefined) return null
    grams[field] = value
  }

  return { kalorien, ...grams }
}
