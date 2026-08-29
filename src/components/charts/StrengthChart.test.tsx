import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import StrengthChart from './StrengthChart'

const sitzung = (id: string, tag: string) => ({
  id,
  gestartet_am: `${tag}T18:00:00+02:00`,
  beendet_am: `${tag}T19:00:00+02:00`,
  gesamt_kalorien: 300,
})

const satz = (sessionId: string, exercise_id: string, name: string, gewicht: number) => ({
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

const sessions = [sitzung('s1', '2026-08-17'), sitzung('s2', '2026-08-24')]

describe('StrengthChart', () => {
  it('draws one point per session for the chosen exercise', () => {
    // Marken statt Achsentexte: Recharts ueberspringt Ticks je nach Layout.
    // type="monotone" liefert bei genau zwei Punkten M…L…, daher zaehlt [ML].
    const { container } = render(
      <StrengthChart
        sessions={sessions}
        sets={[satz('s1', 'e1', 'Bankdruecken', 90), satz('s2', 'e1', 'Bankdruecken', 95)]}
      />,
    )
    const kurve = container.querySelector('.recharts-line-curve')!
    expect(kurve.getAttribute('d')!.match(/[ML]/g)).toHaveLength(2)
  })

  it('states the empty case instead of drawing one lonely point', () => {
    render(
      <StrengthChart sessions={[sessions[0]]} sets={[satz('s1', 'e1', 'Bankdruecken', 90)]} />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('switches the exercise', () => {
    const { container } = render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
      />,
    )
    // Vorbelegt ist die haeufigste Uebung (e1, zwei Arbeitssaetze).
    expect(container.querySelector('.recharts-line-curve')).not.toBeNull()

    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e2' } })
    // Kniebeuge hat nur eine Session — zu wenig fuer eine Linie.
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('keeps the exercise select usable after switching to a data-poor exercise', () => {
    // Kritischer Fund: die Auswahl durfte nicht mit dem Graphen verschwinden,
    // sonst gibt es aus der leeren Ansicht keinen Weg zurueck.
    render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
      />,
    )
    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e2' } })
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()

    // Zurueckwechseln muss trotz leerem Zustand moeglich sein.
    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e1' } })
    expect(screen.queryByText('Noch nicht genug Daten für diesen Graphen.')).toBeNull()
  })

  it('locks in a user with a data-poor default exercise out of nothing', () => {
    // Reproduziert den Fund direkt: die vorbelegte Uebung (haeufigste, hier e1
    // mit zwei Arbeitssaetzen in einer Session) hat selbst zu wenig Punkte,
    // aber e2 (zwei Sessions) haette welche. Die Auswahl muss trotzdem stehen.
    render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s1', 'e1', 'Bankdruecken', 92),
          satz('s1', 'e2', 'Kniebeuge', 100),
          satz('s2', 'e2', 'Kniebeuge', 105),
        ]}
      />,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
    expect(screen.getByLabelText('Übung')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e2' } })
    expect(screen.queryByText('Noch nicht genug Daten für diesen Graphen.')).toBeNull()
  })

  it('hides the exercise select on the dashboard', () => {
    render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
        mitUebungsauswahl={false}
      />,
    )
    expect(screen.queryByLabelText('Übung')).toBeNull()
  })

  it('names the exercise in the title when the select is hidden', () => {
    // Wichtig-Fund: ohne Auswahl auf dem Dashboard muss der Titel sagen,
    // welche Uebung gemeint ist.
    render(
      <StrengthChart
        sessions={sessions}
        sets={[satz('s1', 'e1', 'Bankdruecken', 90), satz('s2', 'e1', 'Bankdruecken', 95)]}
        mitUebungsauswahl={false}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Kraftverlauf – Bankdruecken' }),
    ).toBeInTheDocument()
  })

  it('falls back from a stale selection after the data no longer contains it', () => {
    // Wichtig-Fund: ein Zeitraumwechsel kann die gewaehlte Uebung aus den Daten
    // nehmen. Statt eines leeren <select> muss die Vorbelegung greifen.
    const { rerender } = render(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e2', 'Kniebeuge', 120),
        ]}
      />,
    )
    fireEvent.change(screen.getByLabelText('Übung'), { target: { value: 'e2' } })
    expect(screen.getByLabelText('Übung')).toHaveValue('e2')

    // Neuer Zeitraum: e2 kommt in den Saetzen nicht mehr vor (e3 bleibt drin,
    // damit die Auswahl bei zwei Optionen ueberhaupt noch gerendert wird).
    rerender(
      <StrengthChart
        sessions={sessions}
        sets={[
          satz('s1', 'e1', 'Bankdruecken', 90),
          satz('s2', 'e1', 'Bankdruecken', 95),
          satz('s1', 'e3', 'Kreuzheben', 150),
        ]}
      />,
    )
    expect(screen.getByLabelText('Übung')).toHaveValue('e1')
  })
})
