import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import WeightTrendChart from './WeightTrendChart'

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

const zeile = (id: string, datum: string, gewicht: number | null) => ({
  id,
  datum,
  gewicht,
  ...leer,
})

describe('WeightTrendChart', () => {
  it('draws a point per weighed day on both lines', () => {
    // Tick text cannot carry this assertion in jsdom (see the training
    // frequency chart's test). Two lines are drawn (gewicht, trend), so both
    // curves must be checked — a test that only looked at one would not
    // notice the trend line disappearing.
    const { container } = render(
      <WeightTrendChart
        rows={[zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]}
      />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(2)
    for (const kurve of kurven) {
      const punkte = kurve.getAttribute('d')!.match(/[ML]/g)
      expect(punkte).toHaveLength(2)
    }
  })

  it('names both lines so the trend is not mistaken for the measurement', () => {
    render(
      <WeightTrendChart
        rows={[zeile('a', '2026-08-17', 83.3), zeile('b', '2026-08-24', 82.5)]}
      />,
    )
    expect(screen.getByText('Gewicht')).toBeInTheDocument()
    expect(screen.getByText('Trend')).toBeInTheDocument()
  })

  it('ignores entries that recorded only circumferences', () => {
    const { container } = render(
      <WeightTrendChart
        rows={[
          zeile('a', '2026-08-17', 83.3),
          zeile('b', '2026-08-20', null),
          zeile('c', '2026-08-24', 82.5),
        ]}
      />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(2)
    for (const kurve of kurven) {
      const punkte = kurve.getAttribute('d')!.match(/[ML]/g)
      expect(punkte).toHaveLength(2)
    }
  })

  it('says so with a single weight', () => {
    render(<WeightTrendChart rows={[zeile('a', '2026-08-24', 82.5)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
