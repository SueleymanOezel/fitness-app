/**
 * German labels for the 3 difficulty-level values that exist in
 * exercises.schwierigkeitsgrad (imported verbatim from free-exercise-db's
 * `level` field). Small, fixed vocabulary, same pattern as
 * muscle-group-labels.ts/equipment-labels.ts.
 */
const LEVEL_LABEL: Record<string, string> = {
  beginner: 'Anfänger',
  intermediate: 'Fortgeschritten',
  expert: 'Experte',
}

/** Falls back to the raw value for anything outside the known 3 (e.g. a future re-import with a new level). */
export function levelLabel(value: string): string {
  return LEVEL_LABEL[value] ?? value
}
