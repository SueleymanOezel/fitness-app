import { describe, expect, it } from 'vitest'
import { calculateCalorieGoal, effectiveCalorieGoal, kalorienAufschluesselung, zielHeute } from './nutrition-goal'

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
    // Everyday need without sport (DGE): 1780 * 1.8 = 3204
    expect(calculateCalorieGoal(baseInput)).toBe(3204)
  })

  it('calculates TDEE for a female profile', () => {
    const input = { ...baseInput, geschlecht: 'weiblich' as const }
    // BMR = 10*80 + 6.25*180 - 5*30 - 161 = 800 + 1125 - 150 - 161 = 1614
    // 1614 * 1.8 = 2905.2 -> rounds to 2905
    expect(calculateCalorieGoal(input)).toBe(2905)
  })

  it('subtracts ziel_delta_kcal when ziel is abnehmen', () => {
    const input = { ...baseInput, ziel: 'abnehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(3204 - 500)
  })

  it('adds ziel_delta_kcal when ziel is zunehmen', () => {
    const input = { ...baseInput, ziel: 'zunehmen' as const }
    expect(calculateCalorieGoal(input)).toBe(3204 + 500)
  })

  it('applies the sitzend activity factor', () => {
    const input = { ...baseInput, aktivitaetslevel: 'sitzend' as const }
    expect(calculateCalorieGoal(input)).toBe(Math.round(1780 * 1.4))
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
    expect(effectiveCalorieGoal({ ...baseInput, taegliches_kalorienziel: null })).toBe(3204)
  })
})

describe('kalorienAufschluesselung', () => {
  const profil = {
    geschlecht: 'maennlich' as const,
    aktivitaetslevel: 'moderat' as const,
    ziel: 'abnehmen' as const,
    ziel_delta_kcal: 400,
    aktuelles_gewicht: 82.4,
    groesse: 181,
    alter: 29,
    taegliches_kalorienziel: null,
  }

  it('adds up: need plus delta plus the training of today is the goal of today', () => {
    const teile = kalorienAufschluesselung(profil, 412.6)!
    expect(teile.basis.art).toBe('bedarf')
    expect(teile.delta).toBe(-400)
    expect(teile.training).toBe(413)
    expect(teile.basis.kcal + teile.delta + teile.training).toBe(teile.ziel)
    expect(teile.ziel).toBe(zielHeute(profil, 412.6))
  })

  it('has no delta when maintaining', () => {
    expect(kalorienAufschluesselung({ ...profil, ziel: 'halten' }, 0)!.delta).toBe(0)
  })

  it('puts training on top of a fixed goal too, and is null for an incomplete profile', () => {
    expect(kalorienAufschluesselung({ ...profil, taegliches_kalorienziel: 2200 }, 300)).toEqual({
      basis: { art: 'fest', kcal: 2200 },
      delta: 0,
      training: 300,
      ziel: 2500,
    })
    expect(kalorienAufschluesselung({ ...profil, groesse: null }, 300)).toBeNull()
  })
})

describe('zielHeute', () => {
  it('is the daily goal plus the training of today, and null without a goal', () => {
    expect(zielHeute({ ...baseInput, taegliches_kalorienziel: 1800 }, 250)).toBe(2050)
    expect(zielHeute({ ...baseInput, taegliches_kalorienziel: null }, 0)).toBe(3204)
    expect(zielHeute({ ...baseInput, ziel: null, taegliches_kalorienziel: null }, 250)).toBeNull()
  })
})