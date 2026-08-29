import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import BestSetWeightChart from './BestSetWeightChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, gewicht: number, exercise_id = 'e1', name = 'Bankdruecken') => ({
  id: `${sessionId}-${exercise_id}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id,
  exercise_name: name,
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 5,
  ist_aufwaermsatz: false,
})

describe('BestSetWeightChart', () => {
  it('draws a point per session', () => {
    const { container } = render(
      <BestSetWeightChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 80), satz('s2', 85)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case for a single session', () => {
    render(<BestSetWeightChart sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 80)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('keeps the exercise select usable in the empty state', () => {
    // Kritischer Fund: die Auswahl darf nicht mit dem Graphen verschwinden.
    render(
      <BestSetWeightChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[
          satz('s1', 80),
          satz('s2', 85),
          satz('s1', 100, 'e2', 'Kniebeuge'),
        ]}
      />,
    )
    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e2' } })
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
    expect(screen.getByLabelText('Übung')).toBeInTheDocument()
  })

  it('names the exercise in the title when the select is hidden', () => {
    render(
      <BestSetWeightChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 80), satz('s2', 85)]}
        mitUebungsauswahl={false}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Bestes Satzgewicht – Bankdruecken' }),
    ).toBeInTheDocument()
  })
})
