export type CalorieGoalInput = {
  geschlecht: 'maennlich' | 'weiblich' | null
  aktivitaetslevel: 'sitzend' | 'leicht' | 'moderat' | 'hoch' | 'sehr_hoch' | null
  ziel: 'abnehmen' | 'halten' | 'zunehmen' | null
  ziel_delta_kcal: number
  aktuelles_gewicht: number | null
  groesse: number | null
  alter: number | null
}

/**
 * Everyday activity WITHOUT sport, as physical activity levels of the German
 * nutrition society (DGE): sport is counted on top from the logged workouts
 * (MET), so a factor that already contained it would count training twice.
 */
export const ACTIVITY_FACTORS: Record<NonNullable<CalorieGoalInput['aktivitaetslevel']>, number> = {
  sitzend: 1.4,
  leicht: 1.6,
  moderat: 1.8,
  hoch: 2.0,
  sehr_hoch: 2.2,
}

/** Profile labels: what the day looks like, not how much sport (that is logged). */
export const AKTIVITAET_LABEL: Record<NonNullable<CalorieGoalInput['aktivitaetslevel']>, string> = {
  sitzend: 'Fast nur sitzend (Büro, kaum Wege)',
  leicht: 'Sitzend mit Gehen und Stehen',
  moderat: 'Überwiegend stehend oder gehend',
  hoch: 'Körperlich anstrengend',
  sehr_hoch: 'Sehr schwer körperlich',
}

/** Everyday need before sport and before the goal's surplus/deficit: Mifflin-St-Jeor BMR times the activity factor. Null while the profile is incomplete. */
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

/** Today's goal: the daily goal plus what today's workouts burned. Training always counts on top, also on a fixed goal. */
export function zielHeute(
  input: CalorieGoalInput & { taegliches_kalorienziel: number | null },
  trainingKcal: number,
): number | null {
  const basis = effectiveCalorieGoal(input)
  return basis == null ? null : basis + Math.max(0, Math.round(trainingKcal))
}

export type KalorienAufschluesselung = {
  /** Where the sum starts: the computed everyday need, or the goal the user set by hand. */
  basis: { art: 'bedarf' | 'fest'; kcal: number }
  /** Goal minus need: negative when losing, positive when gaining, 0 when maintaining or on a fixed goal. */
  delta: number
  /** Rounded kcal of today's workouts. */
  training: number
  /** basis + delta + training: today's goal. */
  ziel: number
}

/** How today's goal comes about, so the sum reads: need + delta + training = goal. Null for an incomplete profile. */
export function kalorienAufschluesselung(
  input: CalorieGoalInput & { taegliches_kalorienziel: number | null },
  trainingKcal: number,
): KalorienAufschluesselung | null {
  const training = Math.max(0, Math.round(trainingKcal))
  if (input.taegliches_kalorienziel != null) {
    const fest = input.taegliches_kalorienziel
    return { basis: { art: 'fest', kcal: fest }, delta: 0, training, ziel: fest + training }
  }
  const tdee = calculateTdee(input)
  const tagesziel = calculateCalorieGoal(input)
  if (tdee == null || tagesziel == null) return null
  const bedarf = Math.round(tdee)
  return { basis: { art: 'bedarf', kcal: bedarf }, delta: tagesziel - bedarf, training, ziel: tagesziel + training }
}