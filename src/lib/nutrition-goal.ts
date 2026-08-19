export type CalorieGoalInput = {
  geschlecht: 'maennlich' | 'weiblich' | null
  aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null
  ziel: 'abnehmen' | 'halten' | 'zunehmen' | null
  ziel_delta_kcal: number
  aktuelles_gewicht: number | null
  groesse: number | null
  alter: number | null
}

const ACTIVITY_FACTORS: Record<NonNullable<CalorieGoalInput['aktivitaetslevel']>, number> = {
  sitzend: 1.2,
  leicht: 1.375,
  moderat: 1.55,
  hoch: 1.725,
  sehr_hoch: 1.9,
}

export function calculateCalorieGoal(input: CalorieGoalInput): number | null {
  const { geschlecht, aktivitaetslevel, ziel, ziel_delta_kcal, aktuelles_gewicht, groesse, alter } = input

  if (!geschlecht || !aktivitaetslevel || !ziel) return null
  if (aktuelles_gewicht == null || groesse == null || alter == null) return null

  const bmr =
    geschlecht === 'maennlich'
      ? 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter + 5
      : 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter - 161

  const tdee = bmr * ACTIVITY_FACTORS[aktivitaetslevel]

  // A delta larger than the TDEE would otherwise yield a negative goal.
  if (ziel === 'abnehmen') return Math.max(0, Math.round(tdee - ziel_delta_kcal))
  if (ziel === 'zunehmen') return Math.round(tdee + ziel_delta_kcal)
  return Math.round(tdee)
}

export function effectiveCalorieGoal(
  input: CalorieGoalInput & { taegliches_kalorienziel: number | null },
): number | null {
  if (input.taegliches_kalorienziel != null) return input.taegliches_kalorienziel
  return calculateCalorieGoal(input)
}
