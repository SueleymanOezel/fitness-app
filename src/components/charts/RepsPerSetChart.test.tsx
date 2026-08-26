import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RepsPerSetChart from './RepsPerSetChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, satz_nummer: number, wiederholungen: number) => ({
  id: `${sessionId}-${satz_nummer}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer,
  gewicht: 80,
  wiederholungen,
  ist_aufwaermsatz: false,
})

describe('RepsPerSetChart', () => {
  it('draws one line per working set', () => {
    const { container } = render(
      <RepsPerSetChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[
          satz('s1', 1, 10),
          satz('s1', 2, 8),
          satz('s2', 1, 10),
          satz('s2', 2, 9),
        ]}
      />,
    )
    expect(container.querySelectorAll('.recharts-line-curve')).toHaveLength(2)
  })

  it('names the lines so the sets are told apart', () => {
    render(
      <RepsPerSetChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 1, 10), satz('s2', 1, 10)]}
      />,
    )
    expect(screen.getByText('Satz 1')).toBeInTheDocument()
  })

  it('states the empty case for a single session', () => {
    render(<RepsPerSetChart sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 1, 10)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
