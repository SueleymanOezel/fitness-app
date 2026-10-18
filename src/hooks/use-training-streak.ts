import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { aktuellerStreak, trainingstage } from '../lib/streak'
import { localDay } from '../lib/local-time'

/**
 * Aktueller Trainings-Streak, ungebunden an einen Zeitraum — ein Streak kann
 * aelter sein als jedes Dashboard-Fenster (90 Tage), siehe aktuellerStreak in
 * src/lib/streak.ts. Verwendet an drei Stellen: der Home-Statuskarte, dem
 * Abschluss-Screen (WorkoutSessionPage.tsx) und dem Wochenstreifen
 * (TrainingPage) — alle rufen diesen Hook auf, damit sie nie
 * unterschiedliche Werte zeigen koennen.
 */
export function useTrainingStreak(userId: string) {
  const [streak, setStreak] = useState(0)
  const [tage, setTage] = useState<string[]>([])
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
    setTage(ergebnis.failed ? [] : trainingstage(ergebnis.rows))
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { streak, tage, loading }
}
