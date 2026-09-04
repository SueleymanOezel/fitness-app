import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisFoodEntry = {
  zeitpunkt: string
  menge: number
  mahlzeit: number | null
  products: { kalorien: number; eiweiss: number; fett: number; kohlenhydrate: number } | null
}

/** Was E6 von einer Trainingseinheit braucht — mehr liest diese Abfrage nicht. */
export type AnalysisSessionKalorien = {
  gestartet_am: string | null
  gesamt_kalorien: number | null
}

// The macro columns come along although E1 only needs calories: E2 and E3 read
// the same query later, and widening it then would mean changing reviewed code.
const COLUMNS = 'zeitpunkt, menge, mahlzeit, products(kalorien, eiweiss, fett, kohlenhydrate)'
const SESSION_COLUMNS = 'gestartet_am, gesamt_kalorien'

/**
 * One query per area, not one per chart — plus die Trainingskalorien, die E6
 * ueber den Bereich hinaus braucht (Spec, Abschnitt 3).
 *
 * Beide Abfragen blaettern (`seitenweiseLaden`): `food_entries` hat keine
 * natuerliche Obergrenze, und PostgREST deckelt still bei db-max-rows.
 */
export function useNutritionAnalysis(userId: string, zeitraum: Zeitraum) {
  const [entries, setEntries] = useState<AnalysisFoodEntry[]>([])
  const [sessions, setSessions] = useState<AnalysisSessionKalorien[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const start = rangeStart(zeitraum)

    const eintragErgebnis = await seitenweiseLaden<AnalysisFoodEntry>((from, to) => {
      let query = supabase.from('food_entries').select(COLUMNS).eq('user_id', userId)
      // `zeitpunkt` is timestamptz and the bound is a date: Postgres reads it as
      // midnight of that day, which is the lower bound we want.
      if (start) query = query.gte('zeitpunkt', start)
      return (
        query
          .order('zeitpunkt', { ascending: true })
          // id als Tiebreaker: `zeitpunkt` ist nicht eindeutig, und ohne totale
          // Ordnung kann eine Zeile an der Seitengrenze doppelt oder gar nicht
          // ankommen. Die Spalte wird nur sortiert, nicht gelesen.
          .order('id', { ascending: true })
          .range(from, to)
      )
    })
    if (current !== requestId.current) return

    const sessionErgebnis = await seitenweiseLaden<AnalysisSessionKalorien>((from, to) => {
      let query = supabase.from('workout_sessions').select(SESSION_COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('gestartet_am', start)
      return query
        .order('gestartet_am', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    setEntries(eintragErgebnis.failed ? [] : eintragErgebnis.rows)
    setSessions(sessionErgebnis.failed ? [] : sessionErgebnis.rows)
    // Ein Ladefehler gehoert dem Bereich: eine Meldung oben auf der Seite, egal
    // welche der beiden Abfragen gescheitert ist.
    setError(eintragErgebnis.failed || sessionErgebnis.failed)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { entries, sessions, loading, error }
}
