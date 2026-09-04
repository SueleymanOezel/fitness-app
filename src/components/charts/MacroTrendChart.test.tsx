import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MacroTrendChart from './MacroTrendChart'

const eintrag = (tag: number, eiweiss: number, fett: number, kohlenhydrate: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 0, eiweiss, fett, kohlenhydrate },
})

describe('MacroTrendChart', () => {
  it('draws one line per macro with a point per day', () => {
    const { container } = render(
      <MacroTrendChart entries={[eintrag(23, 100, 50, 200), eintrag(24, 120, 40, 180)]} />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(3)
    for (const kurve of kurven) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('names every line so the three macros are distinguishable', () => {
    render(<MacroTrendChart entries={[eintrag(23, 100, 50, 200), eintrag(24, 120, 40, 180)]} />)
    expect(screen.getByText('Eiweiß (g)')).toBeInTheDocument()
    expect(screen.getByText('Fett (g)')).toBeInTheDocument()
    expect(screen.getByText('Kohlenhydrate (g)')).toBeInTheDocument()
  })

  it('states the empty case with a single day', () => {
    render(<MacroTrendChart entries={[eintrag(24, 120, 40, 180)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
