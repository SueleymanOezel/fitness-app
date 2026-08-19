import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailySummary from './DailySummary'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 200,
    zeitpunkt: '2026-08-18T12:00:00Z',
    product_id: 'p1',
    products: {
      id: 'p1',
      name: 'A',
      barcode: null,
      created_by: 'u1',
      kalorien: 100,
      eiweiss: 10,
      fett: 5,
      kohlenhydrate: 20,
    },
  },
  {
    id: 'e2',
    menge: 50,
    zeitpunkt: '2026-08-18T13:00:00Z',
    product_id: 'p2',
    products: {
      id: 'p2',
      name: 'B',
      barcode: null,
      created_by: 'u1',
      kalorien: 400,
      eiweiss: 4,
      fett: 40,
      kohlenhydrate: 0,
    },
  },
]

describe('DailySummary', () => {
  it('sums calories scaled by menge/100 and shows the remaining amount against the goal', () => {
    // e1: 100 * 200/100 = 200 kcal; e2: 400 * 50/100 = 200 kcal; total 400
    render(<DailySummary entries={entries} goal={2000} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
    expect(screen.getByText(/1600 kcal offen/)).toBeInTheDocument()
  })

  it('omits the remaining amount when there is no goal', () => {
    render(<DailySummary entries={entries} goal={null} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
    expect(screen.queryByText(/offen/)).not.toBeInTheDocument()
  })

  it('sums macros scaled by menge/100', () => {
    // eiweiss: 10*2 + 4*0.5 = 20 + 2 = 22
    render(<DailySummary entries={entries} goal={null} />)
    expect(screen.getByText(/22 g/)).toBeInTheDocument()
  })

  it('ignores entries whose product was deleted', () => {
    const withMissing: FoodEntry[] = [
      ...entries,
      { id: 'e3', menge: 100, zeitpunkt: '2026-08-18T14:00:00Z', product_id: null, products: null },
    ]
    render(<DailySummary entries={withMissing} goal={null} />)
    expect(screen.getByText(/400 kcal verbraucht/)).toBeInTheDocument()
  })
})
