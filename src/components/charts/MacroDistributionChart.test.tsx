import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MacroDistributionChart from './MacroDistributionChart'

const eintrag = (tag: number, eiweiss: number, fett: number, kohlenhydrate: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 8, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien: 0, eiweiss, fett, kohlenhydrate },
})

describe('MacroDistributionChart', () => {
  it('draws one bar per macro, labelled with its gram amount', () => {
    const { container } = render(
      <MacroDistributionChart entries={[eintrag(24, 30, 20, 50)]} heute="2026-08-24" />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(3)
    expect(screen.getByText('30 g')).toBeInTheDocument()
    expect(screen.getByText('20 g')).toBeInTheDocument()
    expect(screen.getByText('50 g')).toBeInTheDocument()
  })

  it('names every bar so the three macros are distinguishable', () => {
    render(<MacroDistributionChart entries={[eintrag(24, 30, 20, 50)]} heute="2026-08-24" />)
    expect(screen.getByText('Eiweiß')).toBeInTheDocument()
    expect(screen.getByText('Fett')).toBeInTheDocument()
    expect(screen.getByText('Kohlenhydrate')).toBeInTheDocument()
  })

  it('states the empty case without any logged macro today', () => {
    render(<MacroDistributionChart entries={[]} heute="2026-08-24" />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('ignores entries from other days', () => {
    render(<MacroDistributionChart entries={[eintrag(23, 30, 20, 50)]} heute="2026-08-24" />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
