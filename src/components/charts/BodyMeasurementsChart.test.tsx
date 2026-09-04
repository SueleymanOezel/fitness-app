import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import BodyMeasurementsChart from './BodyMeasurementsChart'

const zeile = (datum: string, bauch: number | null, rest: number | null = bauch) => ({
  id: datum,
  datum,
  gewicht: 82.5,
  koerperfettanteil: null,
  bauchumfang: bauch,
  beinumfang: rest,
  armumfang: rest,
  ruckenumfang: rest,
  brustumfang: rest,
})

describe('BodyMeasurementsChart', () => {
  it('draws one line per circumference with a point per measured day', () => {
    // Marken statt Achsentexte: Recharts ueberspringt Ticks je nach Layout.
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <BodyMeasurementsChart rows={[zeile('2026-08-17', 92), zeile('2026-08-24', 90)]} />,
    )
    const kurven = container.querySelectorAll('.recharts-line-curve')
    expect(kurven).toHaveLength(5)
    for (const kurve of kurven) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('ignores a day that measured only the weight', () => {
    const { container } = render(
      <BodyMeasurementsChart
        rows={[zeile('2026-08-17', 92), zeile('2026-08-20', null), zeile('2026-08-24', 90)]}
      />,
    )
    for (const kurve of container.querySelectorAll('.recharts-line-curve')) {
      expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
    }
  })

  it('names every line so the five are distinguishable', () => {
    render(<BodyMeasurementsChart rows={[zeile('2026-08-17', 92), zeile('2026-08-24', 90)]} />)
    expect(screen.getByText('Bauchumfang (cm)')).toBeInTheDocument()
    expect(screen.getByText('Brustumfang (cm)')).toBeInTheDocument()
  })

  it('states the empty case with a single measured day', () => {
    render(<BodyMeasurementsChart rows={[zeile('2026-08-24', 90)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
