/**
 * MET values per free-exercise-db `category` (Compendium of Physical
 * Activities, approximate). Per-category, not per-exercise: precise enough
 * for a rough calorie estimate without hand-researching 800+ entries.
 */
const MET_BY_CATEGORY: Record<string, number> = {
  strength: 5.0,
  cardio: 8.0,
  stretching: 2.5,
  plyometrics: 8.0,
  powerlifting: 6.0,
  strongman: 6.0,
  'olympic weightlifting': 6.0,
}

const FALLBACK_MET = 5.0

export function metForCategory(category: string): number {
  return MET_BY_CATEGORY[category] ?? FALLBACK_MET
}
