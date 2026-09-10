/**
 * German labels for the 12 equipment values that exist in exercises.equipment
 * (imported verbatim from free-exercise-db, see scripts/import-exercises.ts).
 * Small, fixed vocabulary, same pattern as muscle-group-labels.ts.
 */
const EQUIPMENT_LABEL: Record<string, string> = {
  bands: 'Bänder',
  barbell: 'Langhantel',
  'body only': 'Eigengewicht',
  cable: 'Kabelzug',
  dumbbell: 'Kurzhantel',
  'e-z curl bar': 'SZ-Stange',
  'exercise ball': 'Gymnastikball',
  'foam roll': 'Faszienrolle',
  kettlebells: 'Kettlebell',
  machine: 'Maschine',
  'medicine ball': 'Medizinball',
  other: 'Sonstiges',
}

/** Falls back to the raw value for anything outside the known 12 (e.g. a future re-import with a new equipment type). */
export function equipmentLabel(value: string): string {
  return EQUIPMENT_LABEL[value] ?? value
}
