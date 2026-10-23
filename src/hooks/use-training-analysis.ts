import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { exerciseName } from '../lib/exercise-name'
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
  exercise_id: string
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  ist_aufwaermsatz: boolean
  exercises: { name: string; name_de: string | null; muskelgruppen_primaer: string[] | null } | null
}

type RawSession = AnalysisSession & { workout_session_sets: RawSet[] | null }

// Sets ride along as an embed: one round trip instead of sessions-then-sets. The training
// dashboard waited one round more than the other areas and felt slow on the phone (23.10.2026).
const COLUMNS =
  'id, gestartet_am, beendet_am, gesamt_kalorien, workout_session_sets(id, exercise_id, satz_nummer, gewicht, wiederholungen, ist_aufwaermsatz, exercises(name, name_de, muskelgruppen_primaer))'

/** Ein geloeschter Uebungseintrag laesst den Satz stehen; er verliert nur seinen Namen. */
const UNBEKANNTE_UEBUNG = 'Unbekannte Uebung'

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 *
 * Die Sessions sind seitenweise paginiert (wie `use-exercises.ts`): ohne das
 * waere ein aktiver Nutzer ueber `365`/`alles` still auf db-max-rows
 * abgeschnitten. Die eingebetteten Saetze zaehlen nicht gegen dieses Limit
 * (PostgREST begrenzt nur die Zeilen der Hauptabfrage).
 */
export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [sets, setSets] = useState<AnalysisSet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const start = rangeStart(zeitraum)

    const ergebnis = await seitenweiseLaden<RawSession>((from, to) => {
      let query = supabase.from('workout_sessions').select(COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('gestartet_am', start)
      return query
        .order('gestartet_am', { ascending: true })
        // id als Tiebreaker: gestartet_am ist ueber viele Sessions nicht
        // eindeutig, ohne totale Ordnung koennte eine Zeile an der Seitengrenze
        // doppelt oder gar nicht ankommen.
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    const geladen = ergebnis.failed ? [] : ergebnis.rows
    const saetze: AnalysisSet[] = geladen
      .flatMap((session) =>
        (session.workout_session_sets ?? []).map((row) => ({
          id: row.id,
          workout_session_id: session.id,
          exercise_id: row.exercise_id,
          exercise_name: exerciseName(row.exercises) || UNBEKANNTE_UEBUNG,
          muskelgruppen: row.exercises?.muskelgruppen_primaer ?? [],
          satz_nummer: row.satz_nummer,
          gewicht: row.gewicht,
          wiederholungen: row.wiederholungen,
          ist_aufwaermsatz: row.ist_aufwaermsatz,
        })),
      )
      // Same order the separate sets query used to return.
      .sort((a, b) => a.satz_nummer - b.satz_nummer || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))

    setSessions(
      geladen.map(({ id, gestartet_am, beendet_am, gesamt_kalorien }) => ({ id, gestartet_am, beendet_am, gesamt_kalorien })),
    )
    setSets(saetze)
    setError(ergebnis.failed)
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
