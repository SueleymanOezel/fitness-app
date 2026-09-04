import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightChangeRateChart from './WeightChangeRateChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (datum: string, gewicht: number | null) => ({
  id: datum,
  datum,
  gewicht,
  ...leer,
})

describe('WeightChangeRateChart', () => {
  it('draws a point per week-over-week rate', () => {
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <WeightChangeRateChart
        rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84), zeile('2026-08-15', 83)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('draws the zero line that separates gain from loss', () => {
    const { container } = render(
      <WeightChangeRateChart
        rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84), zeile('2026-08-15', 83)]}
      />,
    )
    // ifOverflow="extendDomain": ohne das verwirft Recharts eine Referenzlinie
    // ausserhalb des Wertebereichs — bei durchweg negativen Raten waere die
    // Nulllinie also genau dann weg, wenn sie am meisten sagt.
    expect(container.querySelector('.recharts-reference-line')).not.toBeNull()
  })

  it('states the empty case with a single rate', () => {
    render(<WeightChangeRateChart rows={[zeile('2026-08-01', 85), zeile('2026-08-08', 84)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('states the empty case without a full week of history', () => {
    render(<WeightChangeRateChart rows={[zeile('2026-08-01', 85), zeile('2026-08-04', 84)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
