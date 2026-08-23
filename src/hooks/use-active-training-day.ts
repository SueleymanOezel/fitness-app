import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextTrainingDay, type PlanDay } from '../lib/next-training-day'
import type { WorkoutPlan } from './use-workout-plans'

export type NamedPlanDay = PlanDay & { name: string }

export function useActiveTrainingDay(userId: string) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [day, setDay] = useState<NamedPlanDay | null>(null)
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    const { data: planRows } = await supabase.from('workout_plans').select('*').eq('user_id', userId).eq('aktiv', true)
    const activePlan = ((planRows ?? []) as WorkoutPlan[])[0] ?? null

    if (!activePlan) {
      if (current !== requestId.current) return
      setPlan(null)
      setDay(null)
      setLoading(false)
      return
    }

    const { data: dayRows } = await supabase
      .from('workout_plan_days')
      .select('id, name, reihenfolge')
      .eq('workout_plan_id', activePlan.id)
      .order('reihenfolge', { ascending: true })
    const days = (dayRows ?? []) as NamedPlanDay[]

    // Only finished sessions advance the rotation — an abandoned one would
    // otherwise skip a day, and Postgres sorts its null beendet_am first.
    const { data: lastSessionRows } = await supabase
      .from('workout_sessions')
      .select('workout_plan_day_id')
      .in(
        'workout_plan_day_id',
        days.map((entry) => entry.id),
      )
      .not('beendet_am', 'is', null)
      .order('beendet_am', { ascending: false })
      .limit(1)
    const lastCompletedDayId =
      ((lastSessionRows ?? []) as { workout_plan_day_id: string }[])[0]?.workout_plan_day_id ?? null

    if (current !== requestId.current) return

    setPlan(activePlan)
    setDay(nextTrainingDay(days, lastCompletedDayId) as NamedPlanDay | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  return { plan, day, loading }
}
