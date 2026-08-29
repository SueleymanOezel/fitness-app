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

/** Mirrors `use-exercises.ts`: PostgREST caps a response at db-max-rows (1000 by default). */
const PAGE_SIZE = 500
/** Stops a misconfigured db-max-rows from turning the loop into an endless one. */
const MAX_PAGES = 40
/**
 * Session-IDs je `.in()`-Aufruf. Bei `alles` mit Jahren an Historie waeren
 * alle IDs in einer Abfrage ein Query-String von zehn kB und mehr — genau die
 * Klasse Fehler, die Phase 3 schon einmal traf ("~32 KB Query-String erzeugt,
 * Gateway lehnt ab").
 */
const ID_CHUNK_SIZE = 100

/** Seitenweise laden, bis eine kurze Seite kommt — sonst schneidet db-max-rows still ab. */
async function seitenweiseLaden<T>(
  seite: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ rows: T[]; failed: boolean }> {
  const rows: T[] = []
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE
    const { data, error } = await seite(from, from + PAGE_SIZE - 1)
    if (error) return { rows: [], failed: true }
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return { rows, failed: false }
}

function inChunks<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size))
  }
  return chunks
}

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 *
 * Die Saetze kommen in einer zweiten Abfrage ueber die IDs der geladenen
 * Sessions. Das ist ein Roundtrip mehr als ein eingebetteter Join, dafuer eine
 * Abfrage, deren Filter man lesen und pruefen kann — und sie entfaellt, wenn im
 * Zeitraum gar nicht trainiert wurde.
 *
 * Beide Abfragen sind seitenweise paginiert (wie `use-exercises.ts`), und die
 * Satzabfrage chunkt die Session-IDs zusaetzlich: ohne beides waere ein
 * aktiver Nutzer ueber `365`/`alles` still auf db-max-rows abgeschnitten, und
 * `order('satz_nummer', …)` haette diesen Schnitt systematisch verzerrt (immer
 * die niedrigen Satznummern behalten).
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

    const sessionErgebnis = await seitenweiseLaden<AnalysisSession>((from, to) => {
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

    // Ein Session-Fehler laesst geladen leer bleiben statt fruehzeitig zurueck-
    // zuspringen: ein einziger Schreibpunkt am Ende, wie zuvor — sonst
    // verdoppelt sich jede Fehlerbehandlung auf zwei Codepfade.
    const geladen = sessionErgebnis.failed ? [] : sessionErgebnis.rows
    let satzFehler = false
    let geladeneSaetze: AnalysisSet[] = []

    if (!sessionErgebnis.failed) {
      for (const idChunk of inChunks(
        geladen.map((session) => session.id),
        ID_CHUNK_SIZE,
      )) {
        const satzErgebnis = await seitenweiseLaden<RawSet>((from, to) =>
          supabase
            .from('workout_session_sets')
            .select(SET_COLUMNS)
            .in('workout_session_id', idChunk)
            .order('satz_nummer', { ascending: true })
            .order('id', { ascending: true })
            .range(from, to),
        )
        if (current !== requestId.current) return
        if (satzErgebnis.failed) {
          satzFehler = true
          geladeneSaetze = []
          break
        }
        geladeneSaetze.push(
          ...satzErgebnis.rows.map((row) => ({
            id: row.id,
            workout_session_id: row.workout_session_id,
            exercise_id: row.exercise_id,
            exercise_name: row.exercises?.name ?? UNBEKANNTE_UEBUNG,
            muskelgruppen: row.exercises?.muskelgruppen_primaer ?? [],
            satz_nummer: row.satz_nummer,
            gewicht: row.gewicht,
            wiederholungen: row.wiederholungen,
            ist_aufwaermsatz: row.ist_aufwaermsatz,
          })),
        )
      }
    }

    // Nochmal pruefen statt nur der Guards je Schleifendurchlauf: der Linter
    // (react-hooks/set-state-in-effect) verlangt einen Check unmittelbar vor
    // den Schreibaufrufen, der nicht in einer Schleife steckt.
    if (current !== requestId.current) return
    setSessions(geladen)
    setSets(geladeneSaetze)
    setError(sessionErgebnis.failed || satzFehler)
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
