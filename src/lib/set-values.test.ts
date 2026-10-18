import { describe, expect, it } from 'vitest'
import { GEWICHT_FEHLER, WIEDERHOLUNGEN_FEHLER, parseSetInput } from './set-values'

describe('parseSetInput', () => {
  it('accepts repetitions with a weight', () => {
    expect(parseSetInput('60', '10')).toEqual({ ok: true, values: { gewicht: 60, wiederholungen: 10 } })
  })

  it('accepts a set without weight (bodyweight exercise)', () => {
    expect(parseSetInput('', '8')).toEqual({ ok: true, values: { gewicht: null, wiederholungen: 8 } })
  })

  it('accepts a German decimal comma and surrounding spaces', () => {
    expect(parseSetInput(' 22,5 ', ' 8 ')).toEqual({ ok: true, values: { gewicht: 22.5, wiederholungen: 8 } })
  })

  it('accepts a weight of exactly 0', () => {
    expect(parseSetInput('0', '5')).toEqual({ ok: true, values: { gewicht: 0, wiederholungen: 5 } })
  })

  it.each([[''], ['   '], ['0'], ['-3'], ['abc'], ['8.5'], ['8,5'], ['1e3']])(
    'rejects %j as repetitions',
    (wiederholungen) => {
      expect(parseSetInput('60', wiederholungen)).toEqual({
        ok: false,
        fehler: { wiederholungen: WIEDERHOLUNGEN_FEHLER },
      })
    },
  )

  it.each([['-1'], ['abc'], ['22,5kg']])('rejects %j as weight', (gewicht) => {
    expect(parseSetInput(gewicht, '10')).toEqual({ ok: false, fehler: { gewicht: GEWICHT_FEHLER } })
  })

  it('reports both fields at once', () => {
    expect(parseSetInput('abc', '')).toEqual({
      ok: false,
      fehler: { gewicht: GEWICHT_FEHLER, wiederholungen: WIEDERHOLUNGEN_FEHLER },
    })
  })

  it('refuses a completely empty set', () => {
    const result = parseSetInput('', '')
    expect(result.ok).toBe(false)
  })
})
