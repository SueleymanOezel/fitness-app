import { AKTIVITAET_LABEL } from './nutrition-goal'

/**
 * These bounds are not cosmetic: the calorie goal is computed from these values,
 * so a mistyped weight of 800 kg would silently produce an absurd target.
 */
export const RANGES = {
  alter: [10, 120],
  groesse: [100, 250],
  aktuelles_gewicht: [30, 300],
  ziel_delta_kcal: [0, 1500],
} as const

export const GESCHLECHT = [
  ['maennlich', 'männlich'],
  ['weiblich', 'weiblich'],
] as const

export const AKTIVITAET = Object.entries(AKTIVITAET_LABEL)

export const ZIEL = [
  ['abnehmen', 'abnehmen'],
  ['halten', 'halten'],
  ['zunehmen', 'zunehmen'],
] as const

/** Empty stays empty (null); out-of-range is rejected so it never reaches the database. */
export function parseNumber(value: string, [min, max]: readonly [number, number]) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : undefined
}
