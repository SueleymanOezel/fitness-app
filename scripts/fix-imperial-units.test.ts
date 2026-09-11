import { describe, expect, it } from 'vitest'
import { buildImperialFixUpdate, convertImperialUnits, runImperialFix } from './fix-imperial-units.ts'

describe('convertImperialUnits', () => {
  it('converts a plate weight range in pounds to kg', () => {
    expect(convertImperialUnits('loaded with 5-10 lbs on each side')).toBe('loaded with 2-5 kg on each side')
  })

  it('converts the plate weight range without a space before the unit', () => {
    expect(convertImperialUnits('loaded with 5-10lbs on each side')).toBe('loaded with 2-5 kg on each side')
  })

  it('converts a single plate size in pounds to kg', () => {
    expect(convertImperialUnits('small plates (25-lb ones)')).toBe('small plates (11-kg ones)')
  })

  it('converts a plate size range without a space before the unit', () => {
    expect(convertImperialUnits('larger plates (like 35-45lb ones)')).toBe('larger plates (like 16-20 kg ones)')
  })

  it('converts a reference body weight in pounds to kg', () => {
    expect(convertImperialUnits('A 150 lb person will burn about 230 calories.')).toBe(
      'A 68 kg person will burn about 230 calories.',
    )
  })

  it('converts every occurrence when the pattern appears twice in one sentence', () => {
    const text = 'A 150 lb person can burn 200 calories, and a 150 lb person can burn 500 running.'
    expect(convertImperialUnits(text)).toBe('A 68 kg person can burn 200 calories, and a 68 kg person can burn 500 running.')
  })

  it('leaves text without imperial units unchanged', () => {
    expect(convertImperialUnits('Get into a pushup position.')).toBe('Get into a pushup position.')
  })
})

describe('buildImperialFixUpdate', () => {
  it('returns the corrected anleitung when a sentence contains an imperial unit', () => {
    const update = buildImperialFixUpdate({ id: 'e1', anleitung: ['Get in position.', 'A 150 lb person burns calories.'] })
    expect(update).toEqual({ id: 'e1', anleitung: ['Get in position.', 'A 68 kg person burns calories.'] })
  })

  it('returns null when no sentence contains an imperial unit', () => {
    const update = buildImperialFixUpdate({ id: 'e1', anleitung: ['Get in position.', 'Push up and down.'] })
    expect(update).toBeNull()
  })

  it('returns null when anleitung is null', () => {
    expect(buildImperialFixUpdate({ id: 'e1', anleitung: null })).toBeNull()
  })
})

type Row = { id: string; anleitung: string[] | null }

function createClient(rows: Row[]) {
  const updates: { id: string; anleitung: string[]; anleitung_de: null }[] = []
  return {
    updates,
    from: () => ({
      select: () => ({
        is: () => ({
          range: async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }),
        }),
      }),
      update: (values: { anleitung: string[]; anleitung_de: null }) => ({
        eq: async (_column: string, id: string) => {
          updates.push({ id, ...values })
          return { error: null }
        },
      }),
    }),
  }
}

describe('runImperialFix', () => {
  it('writes corrected anleitung and resets anleitung_de only for rows that changed', async () => {
    const rows: Row[] = [
      { id: 'e1', anleitung: ['A 150 lb person burns calories.'] },
      { id: 'e2', anleitung: ['Get in position.', 'Push up and down.'] },
      { id: 'e3', anleitung: null },
    ]
    const client = createClient(rows)

    const result = await runImperialFix(client)

    expect(client.updates).toEqual([
      { id: 'e1', anleitung: ['A 68 kg person burns calories.'], anleitung_de: null },
    ])
    expect(result).toEqual({ updated: 1, total: 3 })
  })

  it('pages through more than one page of rows', async () => {
    const rows: Row[] = Array.from({ length: 700 }, (_, index) => ({
      id: `e${index}`,
      anleitung: [`A 150 lb person is exercise ${index}.`],
    }))
    const client = createClient(rows)

    const result = await runImperialFix(client)

    expect(client.updates).toHaveLength(700)
    expect(result).toEqual({ updated: 700, total: 700 })
  })
})
