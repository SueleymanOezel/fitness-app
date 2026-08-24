import { describe, expect, it } from 'vitest'
import { parseAuswahl, toggleAuswahl } from './auswahl'

const GUELTIG = ['T1', 'E1', 'K1', 'T3']

describe('parseAuswahl', () => {
  it('keeps the stored ids that still exist', () => {
    expect(parseAuswahl(['T1', 'K1'], GUELTIG)).toEqual(['T1', 'K1'])
  })

  it('drops ids no chart answers to any more', () => {
    // A chart removed in a later version must not break the dashboard of
    // someone who had pinned it.
    expect(parseAuswahl(['T1', 'T99'], GUELTIG)).toEqual(['T1'])
  })

  it('treats anything that is not a list of strings as an empty selection', () => {
    // The column is jsonb: nothing stops a hand-edit in the table editor from
    // putting an object or a number in there.
    expect(parseAuswahl(null, GUELTIG)).toEqual([])
    expect(parseAuswahl({ T1: true }, GUELTIG)).toEqual([])
    expect(parseAuswahl([1, 2], GUELTIG)).toEqual([])
    expect(parseAuswahl('T1', GUELTIG)).toEqual([])
  })

  it('removes duplicates', () => {
    expect(parseAuswahl(['T1', 'T1'], GUELTIG)).toEqual(['T1'])
  })
})

describe('toggleAuswahl', () => {
  it('adds an id that is not selected', () => {
    expect(toggleAuswahl(['T1'], 'K1')).toEqual(['T1', 'K1'])
  })

  it('removes an id that is selected', () => {
    expect(toggleAuswahl(['T1', 'K1'], 'T1')).toEqual(['K1'])
  })

  it('does not change the list it was given', () => {
    // The caller holds this array in React state; mutating it in place would
    // skip the re-render.
    const vorher = ['T1']
    toggleAuswahl(vorher, 'K1')
    expect(vorher).toEqual(['T1'])
  })
})
