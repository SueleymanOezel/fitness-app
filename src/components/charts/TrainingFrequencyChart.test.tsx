import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import TrainingFrequencyChart from './TrainingFrequencyChart'

const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

describe('TrainingFrequencyChart', () => {
  it('draws one bar per week that had a session', () => {
    // Tick text is a Recharts layout heuristic (interval="preserveEnd") that
    // measures text differently in jsdom than in a browser, so it cannot carry
    // this assertion. The mark count can: it proves the computed series
    // actually reached the chart. The gap-filling itself (weeks with zero
    // sessions kept as explicit zero points) is already covered by
    // sessionsJeWoche's own tests in training-charts.test.ts, and cannot be
    // re-checked through rendered bars here — Recharts deliberately never
    // draws a rectangle for a zero-height bar (see Bar.js: "Filter out
    // 0-dimension rectangles"), in a real browser as much as in jsdom, so a
    // zero-session week leaves no mark to count by design.
    const { container } = render(
      <TrainingFrequencyChart
        sessions={[
          { id: 'a', gestartet_am: am(8, 17), beendet_am: am(8, 17), gesamt_kalorien: null },
          { id: 'b', gestartet_am: am(8, 24), beendet_am: am(8, 24), gesamt_kalorien: null },
        ]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('draws a single week as one bar', () => {
    // Spec section 5: lines need two points, bars need one. A lone bar reading
    // "3 Einheiten diese Woche" is a statement, not noise.
    const { container } = render(
      <TrainingFrequencyChart
        sessions={[{ id: 'a', gestartet_am: am(8, 24), beendet_am: am(8, 24), gesamt_kalorien: null }]}
      />,
    )
    expect(
      screen.queryByText('Noch nicht genug Daten für diesen Graphen.'),
    ).not.toBeInTheDocument()
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(1)
  })

  it('says so when nothing was trained at all', () => {
    render(<TrainingFrequencyChart sessions={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
