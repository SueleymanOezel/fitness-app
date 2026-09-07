import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeSparklines from './HomeSparklines'

describe('HomeSparklines', () => {
  it('draws both sparklines with at least two points each', () => {
    const rows = [
      { datum: '2026-08-17', gewicht: 83.0 },
      { datum: '2026-08-18', gewicht: 82.8 },
    ]
    const entries = [
      { zeitpunkt: '2026-08-17T08:00:00Z', menge: 100, products: { kalorien: 200 } },
      { zeitpunkt: '2026-08-18T08:00:00Z', menge: 100, products: { kalorien: 210 } },
    ]
    const { container } = render(<HomeSparklines rows={rows} entries={entries} />)
    const linien = container.querySelectorAll('.recharts-line-curve')
    expect(linien).toHaveLength(2)
    for (const linie of linien) {
      expect(linie.getAttribute('d')).toMatch(/^M/)
    }
  })

  it('shows the empty state without enough points in either source', () => {
    render(<HomeSparklines rows={[]} entries={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
