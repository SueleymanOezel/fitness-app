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

export type WorkoutPlanDayExercise = {
  id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercise: { id: string; name: string } | null
}

export type WorkoutPlanDay = {
  id: string
  name: string
  reihenfolge: number
  exercises: WorkoutPlanDayExercise[]
}

type RawDayExercise = {
  id: string
  workout_plan_day_id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercises: { id: string; name: string } | null
}

export type DayExercisePatch = Partial<
  Pick<WorkoutPlanDayExercise, 'ziel_saetze' | 'ziel_wiederholungen' | 'pausenzeit_sekunden'>
>

export function useWorkoutPlan(planId: string) {
  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [days, setDays] = useState<WorkoutPlanDay[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    // maybeSingle: a deleted plan is an empty result to report, not an exception.
    const { data: planData } = await supabase.from('workout_plans').select('*').eq('id', planId).maybeSingle()
    const { data: dayRows } = await supabase
      .from('workout_plan_days')
      .select('*')
      .eq('workout_plan_id', planId)
      .order('reihenfolge', { ascending: true })

    const rawDays = (dayRows ?? []) as { id: string; name: string; reihenfolge: number }[]
    // Scoped to this plan's days — RLS alone would hand back every day exercise
    // the user owns, across all of their plans.
    const { data: exerciseRows } = await supabase
      .from('workout_plan_day_exercises')
      .select(
        'id, workout_plan_day_id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)',
      )
      .in(
        'workout_plan_day_id',
        rawDays.map((day) => day.id),
      )
      .order('reihenfolge', { ascending: true })

    if (current !== requestId.current) return

    const rawExercises = (exerciseRows ?? []) as unknown as RawDayExercise[]

    setPlan(planData as WorkoutPlan | null)
    setDays(
      rawDays.map((day) => ({
        id: day.id,
        name: day.name,
        reihenfolge: day.reihenfolge,
        exercises: rawExercises
          .filter((row) => row.workout_plan_day_id === day.id)
          .map((row) => ({
            id: row.id,
            exercise_id: row.exercise_id,
            reihenfolge: row.reihenfolge,
            ziel_saetze: row.ziel_saetze,
            ziel_wiederholungen: row.ziel_wiederholungen,
            pausenzeit_sekunden: row.pausenzeit_sekunden,
            exercise: row.exercises,
          })),
      })),
    )
    setLoading(false)
  }, [planId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  async function renamePlan(name: string) {
    const { error } = await supabase.from('workout_plans').update({ name }).eq('id', planId)
    if (error) throw new Error('rename plan failed')
    await reload()
  }

  async function addDay(name: string) {
    const nextReihenfolge = days.length === 0 ? 1 : Math.max(...days.map((day) => day.reihenfolge)) + 1
    const { error } = await supabase
      .from('workout_plan_days')
      .insert({ workout_plan_id: planId, name, reihenfolge: nextReihenfolge })
    if (error) throw new Error('add day failed')
    await reload()
  }

  async function renameDay(dayId: string, name: string) {
    const { error } = await supabase.from('workout_plan_days').update({ name }).eq('id', dayId)
    if (error) throw new Error('rename day failed')
    await reload()
  }

  async function deleteDay(dayId: string) {
    const { error } = await supabase.from('workout_plan_days').delete().eq('id', dayId)
    if (error) throw new Error('delete day failed')
    await reload()
  }

  /** Reordering swaps two neighbouring reihenfolge values, never implicitly over array order. */
  async function moveDay(dayId: string, direction: 'up' | 'down') {
    const sorted = [...days].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const index = sorted.findIndex((day) => day.id === dayId)
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return

    const current = sorted[index]
    const neighbor = sorted[neighborIndex]
    const { error: firstError } = await supabase
      .from('workout_plan_days')
      .update({ reihenfolge: neighbor.reihenfolge })
      .eq('id', current.id)
    if (firstError) throw new Error('move day failed')
    const { error: secondError } = await supabase
      .from('workout_plan_days')
      .update({ reihenfolge: current.reihenfolge })
      .eq('id', neighbor.id)
    if (secondError) {
      // Half a swap leaves two days sharing one reihenfolge, which makes the
      // rotation order undefined — put the first row back before giving up.
      const { error: restoreError } = await supabase
        .from('workout_plan_days')
        .update({ reihenfolge: current.reihenfolge })
        .eq('id', current.id)
      await reload()
      // Distinct message: a failed rollback leaves the order actually broken,
      // which the user has to know to repair by hand.
      throw new Error(restoreError ? 'move day failed and left the order broken' : 'move day failed')
    }
    await reload()
  }

  async function addExerciseToDay(dayId: string, exerciseId: string) {
    const day = days.find((candidate) => candidate.id === dayId)
    // The same exercise twice in one day would collide on exercise_id in the
    // live session (shared React key, shared set count, wrong satz_nummer).
    if (day?.exercises.some((row) => row.exercise_id === exerciseId)) return
    const nextReihenfolge =
      !day || day.exercises.length === 0 ? 1 : Math.max(...day.exercises.map((row) => row.reihenfolge)) + 1
    const { error } = await supabase
      .from('workout_plan_day_exercises')
      .insert({ workout_plan_day_id: dayId, exercise_id: exerciseId, reihenfolge: nextReihenfolge })
    if (error) throw new Error('add exercise failed')
    await reload()
  }

  async function updateDayExercise(id: string, patch: DayExercisePatch) {
    const { error } = await supabase.from('workout_plan_day_exercises').update(patch).eq('id', id)
    if (error) throw new Error('update exercise failed')
    await reload()
  }

  async function removeDayExercise(id: string) {
    const { error } = await supabase.from('workout_plan_day_exercises').delete().eq('id', id)
    if (error) throw new Error('remove exercise failed')
    await reload()
  }

  async function moveDayExercise(dayId: string, exerciseRowId: string, direction: 'up' | 'down') {
    const day = days.find((candidate) => candidate.id === dayId)
    if (!day) return
    const sorted = [...day.exercises].sort((a, b) => a.reihenfolge - b.reihenfolge)
    const index = sorted.findIndex((row) => row.id === exerciseRowId)
    const neighborIndex = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || neighborIndex < 0 || neighborIndex >= sorted.length) return

    const current = sorted[index]
    const neighbor = sorted[neighborIndex]
    const { error: firstError } = await supabase
      .from('workout_plan_day_exercises')
      .update({ reihenfolge: neighbor.reihenfolge })
      .eq('id', current.id)
    if (firstError) throw new Error('move exercise failed')
    const { error: secondError } = await supabase
      .from('workout_plan_day_exercises')
      .update({ reihenfolge: current.reihenfolge })
      .eq('id', neighbor.id)
    if (secondError) {
      // Same half-swap hazard as moveDay.
      const { error: restoreError } = await supabase
        .from('workout_plan_day_exercises')
        .update({ reihenfolge: current.reihenfolge })
        .eq('id', current.id)
      await reload()
      throw new Error(restoreError ? 'move exercise failed and left the order broken' : 'move exercise failed')
    }
    await reload()
  }

  return {
    plan,
    days,
    loading,
    renamePlan,
    addDay,
    renameDay,
    deleteDay,
    moveDay,
    addExerciseToDay,
    updateDayExercise,
    removeDayExercise,
    moveDayExercise,
  }
}
