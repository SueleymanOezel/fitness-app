import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExerciseVolumeChart from './ExerciseVolumeChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, gewicht: number) => ({
  id: `${sessionId}-${gewicht}`,
  workout_session_id: sessionId,
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen: ['brust'],
  satz_nummer: 1,
  gewicht,
  wiederholungen: 8,
  ist_aufwaermsatz: false,
})

describe('ExerciseVolumeChart', () => {
  it('draws one bar per session', () => {
    // Balken statt Linie: Volumen ist eine Menge je Trainingstag, keine Kurve.
    // Eine Marke reicht hier, Balken brauchen keinen zweiten Punkt.
    const { container } = render(
      <ExerciseVolumeChart
        sessions={[sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]}
        sets={[satz('s1', 80), satz('s2', 85)]}
      />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any usable set', () => {
    render(<ExerciseVolumeChart sessions={[sitzung('s1', '2026-08-17')]} sets={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
