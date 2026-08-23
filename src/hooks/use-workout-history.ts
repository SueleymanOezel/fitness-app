import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type SessionSummary = {
  id: string
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
  tag_name: string | null
  plan_name: string | null
}

type RawRow = {
  id: string
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
  workout_plan_days: { name: string; workout_plans: { name: string } | null } | null
}

export function useWorkoutHistory(userId: string) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data } = await supabase
      .from('workout_sessions')
      .select('id, gestartet_am, beendet_am, gesamt_kalorien, workout_plan_days(name, workout_plans(name))')
      .eq('user_id', userId)
      .order('gestartet_am', { ascending: false })

    if (current !== requestId.current) return

    setSessions(
      ((data ?? []) as unknown as RawRow[]).map((row) => ({
        id: row.id,
        gestartet_am: row.gestartet_am,
        beendet_am: row.beendet_am,
        gesamt_kalorien: row.gesamt_kalorien,
        // A deleted day or plan leaves the session itself intact — it just loses its labels.
        tag_name: row.workout_plan_days?.name ?? null,
        plan_name: row.workout_plan_days?.workout_plans?.name ?? null,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { sessions, loading }
}
