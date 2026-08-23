/**
 * MET × body weight (kg) × duration (h), averaged over the MET values of all
 * completed sets — an exercise with more sets carries proportionally more
 * weight without needing any separate weighting logic.
 */
export function sessionKalorien(
  sets: { exercise: { met_wert: number } }[],
  gewichtKg: number,
  dauerStunden: number,
): number {
  if (sets.length === 0) return 0
  const metDurchschnitt = sets.reduce((sum, set) => sum + set.exercise.met_wert, 0) / sets.length
  return metDurchschnitt * gewichtKg * dauerStunden
}
