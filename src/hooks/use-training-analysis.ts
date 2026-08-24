import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisSession = {
  id: string
  gestartet_am: string | null
  beendet_am: string | null
  gesamt_kalorien: number | null
}

const COLUMNS = 'id, gestartet_am, beendet_am, gesamt_kalorien'

/**
 * One query per area, not one per chart: a page shows up to eight training
 * charts, and each of them would otherwise fetch the same rows again.
 */
export function useTrainingAnalysis(userId: string, zeitraum: Zeitraum) {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
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
    setSessions((data ?? []) as unknown as AnalysisSession[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { sessions, loading, error }
}
