import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalorieBalanceChart from './CalorieBalanceChart'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 8, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

const session = (tag: number, kalorien: number) => ({
  gestartet_am: new Date(2026, 7, tag, 18, 0).toISOString(),
  gesamt_kalorien: kalorien,
})

describe('CalorieBalanceChart', () => {
  it('draws a point per day with entries', () => {
    const { container } = render(
      <CalorieBalanceChart
        entries={[eintrag(23, 1800), eintrag(24, 2200)]}
        sessions={[session(24, 300)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case with a single day', () => {
    render(<CalorieBalanceChart entries={[eintrag(24, 2200)]} sessions={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
