import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightVsCaloriesChart from './WeightVsCaloriesChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number) => ({ id: datum, datum, gewicht, ...leer })

const rows = [
  zeile('2026-08-03', 85),
  zeile('2026-08-10', 84),
  zeile('2026-08-17', 83.5),
]

const kalorien = [
  { tag: '2026-08-04', kalorien: 2100 },
  { tag: '2026-08-11', kalorien: 2500 },
  { tag: '2026-08-18', kalorien: 1800 },
]

describe('WeightVsCaloriesChart', () => {
  it('draws one symbol per week', () => {
    // Marken statt Achsentexte; eine Punktwolke zeichnet je Punkt ein Symbol.
    const { container } = render(<WeightVsCaloriesChart rows={rows} kalorien={kalorien} />)
    expect(container.querySelectorAll('.recharts-scatter-symbol')).toHaveLength(2)
  })

  it('draws the zero line that separates gain from loss', () => {
    const { container } = render(<WeightVsCaloriesChart rows={rows} kalorien={kalorien} />)
    expect(container.querySelector('.recharts-reference-line')).not.toBeNull()
  })

  it('states the empty case with a single week', () => {
    // Ein einzelner Punkt zeigt keinen Zusammenhang, nur einen Punkt.
    render(
      <WeightVsCaloriesChart
        rows={[zeile('2026-08-03', 85), zeile('2026-08-10', 84)]}
        kalorien={[{ tag: '2026-08-11', kalorien: 2500 }]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without logged food', () => {
    render(<WeightVsCaloriesChart rows={rows} kalorien={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
