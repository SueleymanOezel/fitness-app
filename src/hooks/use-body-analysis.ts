import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'
import { MEASUREMENT_FIELDS, type BodyMetricRow } from '../lib/body-metrics'

// Derived from the shared field list rather than written out: a measurement
// added later must not silently miss the charts.
const COLUMNS = `id, datum, ${MEASUREMENT_FIELDS.join(', ')}`

/** Ascending, unlike useBodyMetrics: a chart reads left to right through time. */
export function useBodyAnalysis(userId: string, zeitraum: Zeitraum) {
  const [rows, setRows] = useState<BodyMetricRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    let query = supabase.from('body_metrics').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    if (start) query = query.gte('datum', start)
    const { data, error: loadError } = await query.order('datum', { ascending: true })
    if (current !== requestId.current) return
    setRows((data ?? []) as unknown as BodyMetricRow[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++
    }
  }, [reload])

  return { rows, loading, error }
}
