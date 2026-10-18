import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextTrainingDay, type PlanDay } from '../lib/next-training-day'
import type { WorkoutPlan } from './use-workout-plans'
import { useStaleState } from './use-stale-state'

export type NamedPlanDay = PlanDay & { name: string }

export function useActiveTrainingDay(userId: string) {
  const {
    daten: { plan, day },
    loading,
    gelungen,
    gescheitert,
  } = useStaleState<{ plan: WorkoutPlan | null; day: NamedPlanDay | null }>(userId, 'active-training-day', {
    plan: null,
    day: null,
  })
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data: planRows, error: planError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('aktiv', true)
    const activePlan = planError ? null : (((planRows ?? []) as WorkoutPlan[])[0] ?? null)

    // A failed read must not look like "no active plan": every failure ends in
    // one error state, set together with the data below.
    let failed = Boolean(planError)
    let days: NamedPlanDay[] = []
    let lastCompletedDayId: string | null = null

    if (activePlan) {
      const { data: dayRows, error: dayError } = await supabase
        .from('workout_plan_days')
        .select('id, name, reihenfolge')
        .eq('workout_plan_id', activePlan.id)
        .order('reihenfolge', { ascending: true })
      days = (dayRows ?? []) as NamedPlanDay[]

      // Only finished sessions advance the rotation — an abandoned one would
      // otherwise skip a day, and Postgres sorts its null beendet_am first.
      const { data: lastSessionRows, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('workout_plan_day_id')
        .in(
          'workout_plan_day_id',
          days.map((entry) => entry.id),
        )
        .not('beendet_am', 'is', null)
        .order('beendet_am', { ascending: false })
        .limit(1)
      lastCompletedDayId =
        ((lastSessionRows ?? []) as { workout_plan_day_id: string }[])[0]?.workout_plan_day_id ?? null
      failed = Boolean(dayError || sessionError)
    }

    if (current !== requestId.current) return

    // With a last-known copy (offline) the old plan and day stay and are not an error.
    const fehlerAnzeigen = failed
      ? !gescheitert({ plan: null, day: null })
      : (gelungen({
          plan: activePlan,
          day: activePlan ? (nextTrainingDay(days, lastCompletedDayId) as NamedPlanDay | null) : null,
        }),
        false)
    setError(fehlerAnzeigen)
  }, [userId, gelungen, gescheitert])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { plan, day, loading, error, reload }
}
