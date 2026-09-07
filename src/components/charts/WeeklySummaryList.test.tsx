import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeeklySummaryList from './WeeklySummaryList'

describe('WeeklySummaryList', () => {
  it('renders one row per week with all three metrics', () => {
    const sessions = [{ beendet_am: '2026-08-18T10:00:00Z' }]
    const entries = [{ zeitpunkt: '2026-08-17T08:00:00Z', menge: 100, products: { kalorien: 200 } }]
    const rows = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-21', gewicht: 82.5 },
    ]
    render(<WeeklySummaryList sessions={sessions} entries={entries} rows={rows} />)
    const zeile = screen.getByRole('listitem')
    expect(zeile).toHaveTextContent('2026-KW34')
    expect(zeile).toHaveTextContent('1 Trainingseinheiten')
    expect(zeile).toHaveTextContent('200 kcal')
    expect(zeile).toHaveTextContent('−0.5 kg')
  })

  it('shows the empty state without any signal', () => {
    render(<WeeklySummaryList sessions={[]} entries={[]} rows={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
