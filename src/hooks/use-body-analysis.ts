import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'
import { seitenweiseLaden } from '../lib/paged-query'
import { kalorienJeTag, type TagesPunkt } from '../lib/analysis/nutrition-charts'
import { MEASUREMENT_FIELDS, type BodyMetricRow } from '../lib/body-metrics'

// Derived from the shared field list rather than written out: a measurement
// added later must not silently miss the charts.
const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/**
 * K4 rechnet auf Tagessummen, nicht auf Eintraegen — deshalb genau die zwei
 * Spalten, die `kalorienJeTag` liest, und kein Makro mehr.
 */
const FOOD_COLUMNS = 'zeitpunkt, menge, products(kalorien)'

type RawFoodEntry = {
  zeitpunkt: string
  menge: number
  products: { kalorien: number } | null
}

/**
 * Ascending, unlike useBodyMetrics: a chart reads left to right through time.
 *
 * Der Hook greift ueber den Bereich hinaus: K4 („Gewicht ueber Kalorien")
 * braucht die Tagessummen der Ernaehrung im selben Zeitraum (Spec 3,
 * „Datenfluss"). Sie werden hier geholt und nicht im Graphen — ein Graph mit
 * eigenem Datenzugriff waere eine zweite Abfrage neben der des Bereichs.
 *
 * Beide Abfragen sind seitenweise paginiert: `food_entries` ist strukturell
 * ungedeckelt (mehrere Eintraege je Tag), und mit `order('zeitpunkt')` haette
 * db-max-rows genau die juengsten Tage abgeschnitten. `body_metrics` ist mit
 * einer Zeile je Tag zwar traege, erreicht 1000 Zeilen aber nach knapp drei
 * Jahren — bei `alles` also erreichbar.
 */
export function useBodyAnalysis(userId: string, zeitraum: Zeitraum) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [kalorien, setKalorien] = useState<TagesPunkt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const start = rangeStart(zeitraum)

    const metrik = await seitenweiseLaden<BodyMetricRow>((from, to) => {
      let query = supabase.from('body_metrics').select(COLUMNS).eq('user_id', userId)
      if (start) query = query.gte('datum', start)
      return query
        .order('datum', { ascending: true })
        // id als Tiebreaker: ohne totale Ordnung kann eine Zeile an der
        // Seitengrenze doppelt oder gar nicht ankommen.
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    const essen = await seitenweiseLaden<RawFoodEntry>((from, to) => {
      let query = supabase.from('food_entries').select(FOOD_COLUMNS).eq('user_id', userId)
      // `zeitpunkt` ist timestamptz und die Grenze ein Datum: Postgres liest sie
      // als Mitternacht dieses Tages, genau die gewuenschte Untergrenze.
      if (start) query = query.gte('zeitpunkt', start)
      return query
        .order('zeitpunkt', { ascending: true })
        .order('id', { ascending: true })
        .range(from, to)
    })
    if (current !== requestId.current) return

    setRows(metrik.failed ? [] : metrik.rows)
    setKalorien(essen.failed ? [] : kalorienJeTag(essen.rows))
    setError(metrik.failed || essen.failed)
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { rows, kalorien, loading, error }
}
