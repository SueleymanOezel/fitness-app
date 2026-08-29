import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import PersonalRecordsList from './PersonalRecordsList'

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
  wiederholungen: 5,
  ist_aufwaermsatz: false,
})

describe('PersonalRecordsList', () => {
  it('shows the record with the set behind it and the date', () => {
    render(
      <PersonalRecordsList sessions={[sitzung('s1', '2026-08-17')]} sets={[satz('s1', 100)]} />,
    )
    expect(screen.getByText('Bankdruecken')).toBeInTheDocument()
    expect(screen.getByText('116,7 kg (100 kg × 5) am 17.08.2026')).toBeInTheDocument()
  })

  it('states the empty case without records', () => {
    render(<PersonalRecordsList sessions={[]} sets={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
