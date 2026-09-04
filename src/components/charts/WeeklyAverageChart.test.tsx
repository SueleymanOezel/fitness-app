import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeeklyAverageChart from './WeeklyAverageChart'

const eintrag = (jahr: number, monat: number, tag: number, kalorien: number) => ({
  zeitpunkt: new Date(jahr, monat - 1, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('WeeklyAverageChart', () => {
  it('draws one bar per week', () => {
    const { container } = render(
      <WeeklyAverageChart
        entries={[eintrag(2026, 8, 17, 1000), eintrag(2026, 8, 24, 1800)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any entries', () => {
    render(<WeeklyAverageChart entries={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
