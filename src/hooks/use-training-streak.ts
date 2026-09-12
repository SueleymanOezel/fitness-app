import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { aktuellerStreak } from '../lib/streak'
import { localDay } from '../lib/local-time'

/**
 * Aktueller Trainings-Streak, ungebunden an einen Zeitraum — ein Streak kann
 * aelter sein als jedes Dashboard-Fenster (90 Tage), siehe aktuellerStreak in
 * src/lib/streak.ts. Verwendet an zwei Stellen: der Home-Statuskarte und dem
 * Abschluss-Screen (WorkoutSessionPage.tsx) — beide rufen diesen Hook auf,
 * damit sie nie unterschiedliche Werte zeigen koennen.
 */
export function useTrainingStreak(userId: string) {
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const ergebnis = await seitenweiseLaden<{ beendet_am: string | null }>((from, to) =>
      supabase
        .from('workout_sessions')
        .select('beendet_am')
        .eq('user_id', userId)
        .not('beendet_am', 'is', null)
        .order('id', { ascending: true })
        .range(from, to),
    )
    if (current !== requestId.current) return
    setStreak(ergebnis.failed ? 0 : aktuellerStreak(ergebnis.rows, localDay(new Date().toISOString())))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { streak, loading }
}
