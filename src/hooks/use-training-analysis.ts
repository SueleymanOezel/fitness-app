import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisSession = {
  id: string
  gestartet_am: string | null
  beendet_am: string | null
  gesamt_kalorien: number | null
}

export type AnalysisSet = {
  id: string
  workout_session_id: string
  exercise_id: string
  exercise_name: string
  muskelgruppen: string[]
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
}

type RawSet = {
  id: string
  workout_session_id: string
  exercise_id: string
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
  exercises: { name: string; muskelgruppen_primaer: string[] | null } | null
}

const COLUMNS = 'id, gestartet_am, beendet_am, gesamt_kalorien'
const SET_COLUMNS =
  'id, workout_session_id, exercise_id, satz_nummer, gewicht, wiederholungen, ist_aufwaermsatz, exercises(name, muskelgruppen_primaer)'

/** Ein geloeschter Uebungseintrag laesst den Satz stehen; er verliert nur seinen Namen. */
const UNBEKANNTE_UEBUNG = 'Unbekannte Uebung'

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 *
 * Die Saetze kommen in einer zweiten Abfrage ueber die IDs der geladenen
 * Sessions. Das ist ein Roundtrip mehr als ein eingebetteter Join, dafuer eine
 * Abfrage, deren Filter man lesen und pruefen kann — und sie entfaellt, wenn im
 * Zeitraum gar nicht trainiert wurde.
 */
export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [sets, setSets] = useState<AnalysisSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    let query = supabase.from('workout_sessions').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    if (start) query = query.gte('gestartet_am', start)
    const { data, error: loadError } = await query.order('gestartet_am', { ascending: true })
    if (current !== requestId.current) return

    const geladen = (data ?? []) as unknown as AnalysisSession[]
    let satzFehler = false
    let geladeneSaetze: AnalysisSet[] = []

    if (geladen.length > 0) {
      const { data: satzDaten, error: satzLadeFehler } = await supabase
        .from('workout_session_sets')
        .select(SET_COLUMNS)
        .in(
          'workout_session_id',
          geladen.map((session) => session.id),
        )
        .order('satz_nummer', { ascending: true })
      if (current !== requestId.current) return
      satzFehler = Boolean(satzLadeFehler)
      geladeneSaetze = ((satzDaten ?? []) as unknown as RawSet[]).map((row) => ({
        id: row.id,
        workout_session_id: row.workout_session_id,
        exercise_id: row.exercise_id,
        exercise_name: row.exercises?.name ?? UNBEKANNTE_UEBUNG,
        muskelgruppen: row.exercises?.muskelgruppen_primaer ?? [],
        satz_nummer: row.satz_nummer,
        gewicht: row.gewicht,
        wiederholungen: row.wiederholungen,
        ist_aufwaermsatz: row.ist_aufwaermsatz,
      }))
    }

    setSessions(geladen)
    setSets(geladeneSaetze)
    setError(Boolean(loadError) || satzFehler)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { sessions, sets, loading, error }
}
