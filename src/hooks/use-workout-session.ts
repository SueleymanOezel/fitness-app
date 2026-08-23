import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sessionKalorien } from '../lib/workout-calories'

export type SessionInfo = {
  id: string
  workout_plan_day_id: string | null
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
}

export type SessionExercise = {
  exercise_id: string
  name: string
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  reihenfolge: number
}

export type SessionSet = {
  id: string
  exercise_id: string
  satz_nummer: number
  gewicht: number | null
  wiederholungen: number | null
  abgeschlossen_am: string | null
  exercise: { id: string; name: string; met_wert: number | null } | null
}

type RawDayExercise = {
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercises: { id: string; name: string } | null
}

type RawSessionSet = Omit<SessionSet, 'exercise'> & { exercises: SessionSet['exercise'] }

export async function startWorkoutSession(userId: string, dayId: string): Promise<string> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, workout_plan_day_id: dayId, gestartet_am: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) throw new Error('start session failed')
  return (data as { id: string }).id
}

export function useWorkoutSession(sessionId: string) {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [exercises, setExercises] = useState<SessionExercise[]>([])
  const [sets, setSets] = useState<SessionSet[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    // Every logged set triggers a reload; only the newest may write state
    // (and none may write after unmount).
    const current = ++requestId.current
    // maybeSingle: a deleted session is an empty result to report, not an exception.
    const { data: sessionData } = await supabase.from('workout_sessions').select('*').eq('id', sessionId).maybeSingle()
    const dayId = (sessionData as SessionInfo | null)?.workout_plan_day_id ?? null

    const { data: exerciseRows } = dayId
      ? await supabase
          .from('workout_plan_day_exercises')
          .select(
            'exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)',
          )
          .eq('workout_plan_day_id', dayId)
          .order('reihenfolge', { ascending: true })
      : { data: [] }

    const { data: setRows } = await supabase
      .from('workout_session_sets')
      .select('id, exercise_id, satz_nummer, gewicht, wiederholungen, abgeschlossen_am, exercises(id, name, met_wert)')
      .eq('workout_session_id', sessionId)
      .order('abgeschlossen_am', { ascending: true })

    if (current !== requestId.current) return

    setSession(sessionData as SessionInfo | null)
    setExercises(
      ((exerciseRows ?? []) as unknown as RawDayExercise[]).map((row) => ({
        exercise_id: row.exercise_id,
        name: row.exercises?.name ?? '',
        ziel_saetze: row.ziel_saetze,
        ziel_wiederholungen: row.ziel_wiederholungen,
        pausenzeit_sekunden: row.pausenzeit_sekunden,
        reihenfolge: row.reihenfolge,
      })),
    )
    setSets(
      ((setRows ?? []) as unknown as RawSessionSet[]).map((row) => ({
        id: row.id,
        exercise_id: row.exercise_id,
        satz_nummer: row.satz_nummer,
        gewicht: row.gewicht,
        wiederholungen: row.wiederholungen,
        abgeschlossen_am: row.abgeschlossen_am,
        exercise: row.exercises,
      })),
    )
    setLoading(false)
  }, [sessionId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function logSet(exerciseId: string, satzNummer: number, gewicht: number | null, wiederholungen: number | null) {
    const { error } = await supabase.from('workout_session_sets').insert({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      satz_nummer: satzNummer,
      gewicht,
      wiederholungen,
      abgeschlossen_am: new Date().toISOString(),
    })
    if (error) throw new Error('log set failed')
    await reload()
  }

  async function updateSet(setId: string, patch: Partial<Pick<SessionSet, 'gewicht' | 'wiederholungen'>>) {
    const { error } = await supabase.from('workout_session_sets').update(patch).eq('id', setId)
    if (error) throw new Error('update set failed')
    await reload()
  }

  async function completeSession(gewichtKg: number) {
    const beendetAm = new Date().toISOString()
    const dauerStunden =
      (new Date(beendetAm).getTime() - new Date(session?.gestartet_am ?? beendetAm).getTime()) / 1000 / 60 / 60
    const kalorienSets = sets.flatMap((set) =>
      set.exercise?.met_wert == null ? [] : [{ exercise: { met_wert: set.exercise.met_wert } }],
    )
    const gesamtKalorien = sessionKalorien(kalorienSets, gewichtKg, dauerStunden)

    const { error } = await supabase
      .from('workout_sessions')
      .update({ beendet_am: beendetAm, gesamt_kalorien: gesamtKalorien })
      .eq('id', sessionId)
    if (error) throw new Error('complete session failed')
    await reload()
  }

  async function deleteSession() {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId)
    if (error) throw new Error('delete session failed')
  }

  return { session, exercises, sets, loading, logSet, updateSet, completeSession, deleteSession }
}
