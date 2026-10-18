import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { aktuellerStreak, trainingstage } from '../lib/streak'
import { localDay } from '../lib/local-time'
import { useStaleState } from './use-stale-state'

/**
 * Aktueller Trainings-Streak, ungebunden an einen Zeitraum — ein Streak kann
 * aelter sein als jedes Dashboard-Fenster (90 Tage), siehe aktuellerStreak in
 * src/lib/streak.ts. Verwendet an drei Stellen: der Home-Statuskarte, dem
 * Abschluss-Screen (WorkoutSessionPage.tsx) und dem Wochenstreifen
 * (TrainingPage) — alle rufen diesen Hook auf, damit sie nie
 * unterschiedliche Werte zeigen koennen.
 */
export function useTrainingStreak(userId: string) {
  // The finished-session timestamps are what is kept; streak and days are derived from them for today's date.
  const { daten: rows, loading, gelungen, gescheitert } = useStaleState<{ beendet_am: string | null }[]>(
    userId,
    'training-streak',
    [],
  )
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
    if (ergebnis.failed) {
      gescheitert([])
    } else {
      gelungen(ergebnis.rows)
    }
  }, [userId, gelungen, gescheitert])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  const streak = aktuellerStreak(rows, localDay(new Date().toISOString()))
  const tage = trainingstage(rows)
  return { streak, tage, loading }
}
