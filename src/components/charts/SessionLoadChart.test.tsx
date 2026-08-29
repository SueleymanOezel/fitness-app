import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SessionLoadChart from './SessionLoadChart'

const sitzung = (id: string, tag: string, kalorien: number | null) => ({
  id,
  gestartet_am: `${tag}T17:30:00+02:00`,
  beendet_am: `${tag}T18:30:00+02:00`,
  gesamt_kalorien: kalorien,
})

describe('SessionLoadChart', () => {
  it('draws a bar per session and a line for the calories', () => {
    const { container } = render(
      <SessionLoadChart
        sessions={[sitzung('s1', '2026-08-17', 400), sitzung('s2', '2026-08-24', 420)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(1)
  })

  it('names both series so the two axes are readable', () => {
    render(
      <SessionLoadChart
        sessions={[sitzung('s1', '2026-08-17', 400), sitzung('s2', '2026-08-24', 420)]}
      />,
    )
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
  })

  it('states the empty case without a finished session', () => {
    render(
      <SessionLoadChart
        sessions={[
          { id: 's1', gestartet_am: '2026-08-17T17:30:00+02:00', beendet_am: null, gesamt_kalorien: null },
        ]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
