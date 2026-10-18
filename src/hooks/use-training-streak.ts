import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { seitenweiseLaden } from '../lib/paged-query'
import { trainingstage, wochenImPlan } from '../lib/streak'
import { localDay } from '../lib/local-time'
import { useStaleState } from './use-stale-state'

/**
 * Aktueller Trainings-Streak, ungebunden an einen Zeitraum — ein Streak kann
 * aelter sein als jedes Dashboard-Fenster (90 Tage), siehe wochenImPlan in
 * src/lib/streak.ts. Verwendet an drei Stellen: der Home-Statuskarte, dem
 * Abschluss-Screen (WorkoutSessionPage.tsx) und dem Wochenstreifen
 * (TrainingPage) — alle rufen diesen Hook auf, damit sie nie
 * unterschiedliche Werte zeigen koennen.
 */
export function useTrainingStreak(userId: string) {
  // The finished-session timestamps are what is kept; streak and days are derived from them for today's date.
  // `ziel` (Trainingstage pro Woche) comes from the active plan; without one a week with any training counts.
  const { daten, loading, gelungen, gescheitert } = useStaleState<{ rows: { beendet_am: string | null }[]; ziel: number }>(
    userId,
    'training-streak-v2',
    { rows: [], ziel: 1 },
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
    const { data: planRows } = await supabase
      .from('workout_plans')
      .select('haeufigkeit_pro_woche')
      .eq('user_id', userId)
      .eq('aktiv', true)
      .limit(1)
    if (current !== requestId.current) return
    const ziel = ((planRows ?? []) as { haeufigkeit_pro_woche: number | null }[])[0]?.haeufigkeit_pro_woche ?? 1
    if (ergebnis.failed) {
      gescheitert({ rows: [], ziel: 1 })
    } else {
      gelungen({ rows: ergebnis.rows, ziel })
    }
  }, [userId, gelungen, gescheitert])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  const tage = trainingstage(daten.rows)
  const streak = wochenImPlan(tage, localDay(new Date().toISOString()), daten.ziel)
  return { streak, tage, loading }
}
