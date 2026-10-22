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

/** Daily need before the goal's surplus/deficit: Mifflin-St-Jeor BMR times the activity factor. Null while the profile is incomplete. */
export function calculateTdee(input: CalorieGoalInput): number | null {
  const { geschlecht, aktivitaetslevel, ziel, aktuelles_gewicht, groesse, alter } = input

  if (!geschlecht || !aktivitaetslevel || !ziel) return null
  if (aktuelles_gewicht == null || groesse == null || alter == null) return null

  const bmr =
    geschlecht === 'maennlich'
      ? 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter + 5
      : 10 * aktuelles_gewicht + 6.25 * groesse - 5 * alter - 161

  return bmr * ACTIVITY_FACTORS[aktivitaetslevel]
}

export function calculateCalorieGoal(input: CalorieGoalInput): number | null {
  const tdee = calculateTdee(input)
  if (tdee == null) return null
  const { ziel, ziel_delta_kcal } = input

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

export type KalorienAufschluesselung = {
  /** Rounded daily need, from which the goal differs by `delta`. */
  tagesbedarf: number
  /** Goal minus need: negative when losing, positive when gaining, 0 when maintaining. */
  delta: number
  ziel: number
}

/**
 * How the goal comes about, so the sum reads: need + delta = goal. Null for a
 * manually set goal (nothing to break down) or an incomplete profile.
 */
export function kalorienAufschluesselung(
  input: CalorieGoalInput & { taegliches_kalorienziel: number | null },
): KalorienAufschluesselung | null {
  if (input.taegliches_kalorienziel != null) return null
  const tdee = calculateTdee(input)
  const ziel = calculateCalorieGoal(input)
  if (tdee == null || ziel == null) return null
  const tagesbedarf = Math.round(tdee)
  return { tagesbedarf, delta: ziel - tagesbedarf, ziel }
}
