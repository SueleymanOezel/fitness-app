import type { BodyMetricRow, MeasurementField } from './body-metrics'

type Measured = { value: number; datum: string }

/**
 * Both helpers expect rows sorted newest first and skip rows in which the field
 * was not measured. Comparing against the previous *date* instead would report a
 * change against null on every day that only the weight was recorded.
 */
function measured(rows: BodyMetricRow[], field: MeasurementField): Measured[] {
  return rows
    .filter((entry): entry is BodyMetricRow & Record<MeasurementField, number> => entry[field] != null)
    .map((entry) => ({ value: entry[field] as number, datum: entry.datum }))
}

export function latestValue(rows: BodyMetricRow[], field: MeasurementField): Measured | null {
  return measured(rows, field)[0] ?? null
}

export function changeSince(
  rows: BodyMetricRow[],
  field: MeasurementField,
): { delta: number; datum: string } | null {
  const [current, previous] = measured(rows, field)
  if (!current || !previous) return null
  // Rounded to two places: 82.5 - 83.3 is 0.7999999999999972 in binary floats,
  // and "-0,7999999999999972 kg" is not a reading anyone wants.
  return { delta: Math.round((current.value - previous.value) * 100) / 100, datum: previous.datum }
}
