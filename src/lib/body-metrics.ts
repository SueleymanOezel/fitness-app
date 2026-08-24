export const MEASUREMENT_FIELDS = [
  'gewicht',
  'bauchumfang',
  'beinumfang',
  'armumfang',
  'ruckenumfang',
  'brustumfang',
  'koerperfettanteil',
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]

/** Local calendar day as yyyy-mm-dd — toISOString would shift the date in the evening. */
export function today() {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export type BodyMetricInput = Record<MeasurementField, string>
export type BodyMetricValues = Record<MeasurementField, number | null>
export type BodyMetricRow = { id: string; datum: string } & BodyMetricValues

/** Column name is `ruckenumfang` without umlaut — the label carries it. */
export const FIELD_LABELS: Record<MeasurementField, string> = {
  gewicht: 'Gewicht (kg)',
  bauchumfang: 'Bauchumfang (cm)',
  beinumfang: 'Beinumfang (cm)',
  armumfang: 'Armumfang (cm)',
  ruckenumfang: 'Rückenumfang (cm)',
  brustumfang: 'Brustumfang (cm)',
  koerperfettanteil: 'Körperfettanteil (%)',
}

/**
 * Checked before writing rather than left to the database: a rejected row would
 * come back as an unreadable constraint error instead of a usable message.
 */
const BOUNDS: Record<MeasurementField, { min: number; max: number }> = {
  // Same range as aktuelles_gewicht on the profile page. A wider range here
  // would let a body entry sync a weight the profile form then refuses to save.
  gewicht: { min: 30, max: 300 },
  bauchumfang: { min: 10, max: 300 },
  beinumfang: { min: 10, max: 300 },
  armumfang: { min: 10, max: 300 },
  ruckenumfang: { min: 10, max: 300 },
  brustumfang: { min: 10, max: 300 },
  koerperfettanteil: { min: 0, max: 100 },
}

export const EMPTY_INPUT: BodyMetricInput = {
  gewicht: '',
  bauchumfang: '',
  beinumfang: '',
  armumfang: '',
  ruckenumfang: '',
  brustumfang: '',
  koerperfettanteil: '',
}

/**
 * Returns null when a given value is implausible, and also when nothing at all
 * was measured. An empty field means "not measured" and stays null — Number('')
 * is 0, not "unknown".
 */
export function parseBodyMetrics(raw: BodyMetricInput): BodyMetricValues | null {
  const values = {} as BodyMetricValues
  let anyGiven = false

  for (const field of MEASUREMENT_FIELDS) {
    const text = raw[field].trim()
    if (text === '') {
      values[field] = null
      continue
    }
    const value = Number(text)
    const { min, max } = BOUNDS[field]
    if (!Number.isFinite(value) || value < min || value > max) return null
    values[field] = value
    anyGiven = true
  }

  return anyGiven ? values : null
}
