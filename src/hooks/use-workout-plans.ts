import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type WorkoutPlan = {
  id: string
  name: string
  aktiv: boolean
}

export function useWorkoutPlans(userId: string) {
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    // Two quick writes can have their reloads answered out of order; only the
    // newest request may write state (and none may write after unmount).
    const current = ++requestId.current
    const { data } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true })
    if (current !== requestId.current) return
    setPlans((data ?? []) as WorkoutPlan[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function createPlan(name: string) {
    const { error } = await supabase.from('workout_plans').insert({ user_id: userId, name, aktiv: false })
    if (error) throw new Error('create plan failed')
    await reload()
  }

  async function deletePlan(planId: string) {
    const { error } = await supabase.from('workout_plans').delete().eq('id', planId)
    if (error) throw new Error('delete plan failed')
    await reload()
  }

  /** Exactly one plan is active: clear the flag on all of the user's plans, then set it on this one. */
  async function activatePlan(planId: string) {
    const { error: deactivateError } = await supabase
      .from('workout_plans')
      .update({ aktiv: false })
      .eq('user_id', userId)
    if (deactivateError) throw new Error('activate plan failed')

    const { error: activateError } = await supabase.from('workout_plans').update({ aktiv: true }).eq('id', planId)
    if (activateError) throw new Error('activate plan failed')

    await reload()
  }

  return { plans, loading, createPlan, deletePlan, activatePlan }
}
