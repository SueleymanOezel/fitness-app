export type Nutrients = {
  kalorien: number
  eiweiss: number | null
  fett: number | null
  kohlenhydrate: number | null
}

export type NutrientInput = Record<'kalorien' | 'eiweiss' | 'fett' | 'kohlenhydrate', string>

/**
 * products is a shared table — a typo'd -300 or 1e21 would poison everyone's
 * totals, so implausible values never reach the database. Empty macros stay null,
 * missing calories reject the whole set.
 */
export function parseNutrients(raw: NutrientInput): Nutrients | null {
  const parse = (value: string, max: number) => {
    if (value.trim() === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined
  }

  const kalorien = parse(raw.kalorien, 900)
  const eiweiss = parse(raw.eiweiss, 100)
  const fett = parse(raw.fett, 100)
  const kohlenhydrate = parse(raw.kohlenhydrate, 100)

  if (kalorien == null || eiweiss === undefined || fett === undefined || kohlenhydrate === undefined) {
    return null
  }
  return { kalorien, eiweiss, fett, kohlenhydrate }
}
