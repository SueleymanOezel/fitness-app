import { describe, expect, it } from 'vitest'
import { calculateCalorieGoal, effectiveCalorieGoal } from './nutrition-goal'

const baseInput = {
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  aktuelles_gewicht: 80,
  groesse: 180,
  alter: 30,
}

describe('calculateCalorieGoal', () => {
  it('calculates TDEE for a male profile at "halten"', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    expect(calculateCalorieGoal(baseInput)).toBe(2759)
  })

  it('calculates TDEE for a female profile', () => {
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 1780 - 161 - 5 = wait see below
    const input = { ...baseInput, geschlecht: 'weiblich' as const }
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 800 + 1125 - 150 - 161 = 1614
    // TDEE = 1614 * 1.55 = 2501.7 -> rounds to 2502
    expect(calculateCalorieGoal(input)).toBe(2502)
  })

  it('subtracts ziel_delta_kcal when ziel is abnehmen', () => {
    const input = { ...baseInput, ziel: 'abnehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(2759 - 500)
  })

  it('adds ziel_delta_kcal when ziel is zunehmen', () => {
    const input = { ...baseInput, ziel: 'zunehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(2759 + 500)
  })

  it('applies the sitzend activity factor', () => {
    const input = { ...baseInput, aktivitaetslevel: 'sitzend' as const }
    expect(calculateCalorieGoal(input)).toBe(Math.round(1780 * 1.2))
  })

  it('returns null when geschlecht is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, geschlecht: null })).toBeNull()
  })

  it('returns null when aktivitaetslevel is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, aktivitaetslevel: null })).toBeNull()
  })

  it('returns null when ziel is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, ziel: null })).toBeNull()
  })

  it('returns null when a required body metric is missing', () => {
    expect(calculateCalorieGoal({ ...baseInput, aktuelles_gewicht: null })).toBeNull()
    expect(calculateCalorieGoal({ ...baseInput, groesse: null })).toBeNull()
    expect(calculateCalorieGoal({ ...baseInput, alter: null })).toBeNull()
  })
})

describe('effectiveCalorieGoal', () => {
  it('returns the manual value when taegliches_kalorienziel is set', () => {
    expect(effectiveCalorieGoal({ ...baseInput, taegliches_kalorienziel: 1800 })).toBe(1800)
  })

  it('falls back to the calculated value when taegliches_kalorienziel is null', () => {
    expect(effectiveCalorieGoal({ ...baseInput, taegliches_kalorienziel: null })).toBe(2759)
  })
})
