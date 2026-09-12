import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { sessionKalorien } from '../lib/workout-calories'
import { epley1RM, neuePersoenlicheRekorde, type NeuerRekord } from '../lib/analysis/training-charts'

export type SessionInfo = {
  id: string
  workout_plan_day_id: string | null
  gestartet_am: string
  beendet_am: string | null
  gesamt_kalorien: number | null
}

export type SessionExercise = {
  id: string
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
  /** Reps in reserve, 0 = nothing left. Null where it was not rated. */
  rir: number | null
  ist_aufwaermsatz: boolean
  abgeschlossen_am: string | null
  exercise: { id: string; name: string; met_wert: number | null } | null
}

/** What the live form collects for one set. satz_nummer is derived, not entered. */
export type SetValues = {
  gewicht: number | null
  wiederholungen: number | null
  rir: number | null
  ist_aufwaermsatz: boolean
}

type RawSessionExercise = {
  id: string
  exercise_id: string
  reihenfolge: number
  ziel_saetze: number | null
  ziel_wiederholungen: number | null
  pausenzeit_sekunden: number | null
  exercises: { id: string; name: string } | null
}

type RawSessionSet = Omit<SessionSet, 'exercise'> & { exercises: SessionSet['exercise'] }

/**
 * How long an unfinished session stays resumable. Leaving the live page without
 * finishing (back button, closed tab) must not strand a session — but resuming
 * one from days ago would append today's sets to it and bill the whole span
 * between as trained time. Past the window a fresh session is started and the
 * old one stays visible in the history as "nicht beendet".
 */
const RESUME_WINDOW_HOURS = 6

export async function startWorkoutSession(userId: string, dayId: string): Promise<string> {
  const resumableFrom = new Date(Date.now() - RESUME_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const { data: open, error: openError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('workout_plan_day_id', dayId)
    .is('beendet_am', null)
    .gte('gestartet_am', resumableFrom)
    .order('gestartet_am', { ascending: false })
    .limit(1)
  // Without this the resume degrades silently back into opening a second
  // session on any transient failure.
  if (openError) throw new Error('start session failed')
  const openId = ((open ?? []) as { id: string }[])[0]?.id
  if (openId) return openId

  const { data, error } = await supabase
    .from('workout_sessions')
    .insert({ user_id: userId, workout_plan_day_id: dayId, gestartet_am: new Date().toISOString() })
    .select('id')
    .single()
  if (error || !data) throw new Error('start session failed')
  const sessionId = (data as { id: string }).id

  // A fresh session gets its own one-time copy of the day's exercises — see
  // docs/superpowers/specs/2026-09-11-sitzungs-uebungen-design.md. A resumed
  // session (returned above already) keeps the copy it got when it was first
  // created; this only runs for a session that did not exist yet.
  const { data: dayExerciseRows, error: dayExerciseError } = await supabase
    .from('workout_plan_day_exercises')
    .select('exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden')
    .eq('workout_plan_day_id', dayId)
  if (dayExerciseError) throw new Error('start session failed')
  const dayExercises = (dayExerciseRows ?? []) as {
    exercise_id: string
    reihenfolge: number
    ziel_saetze: number | null
    ziel_wiederholungen: number | null
    pausenzeit_sekunden: number | null
  }[]
  if (dayExercises.length > 0) {
    const { error: copyError } = await supabase.from('workout_session_exercises').insert(
      dayExercises.map((row) => ({
        workout_session_id: sessionId,
        exercise_id: row.exercise_id,
        reihenfolge: row.reihenfolge,
        ziel_saetze: row.ziel_saetze,
        ziel_wiederholungen: row.ziel_wiederholungen,
        pausenzeit_sekunden: row.pausenzeit_sekunden,
      })),
    )
    if (copyError) throw new Error('start session failed')
  }

  return sessionId
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
    if (!sessionData) {
      // No session to hang exercises/sets off of — skip both queries rather
      // than surface orphaned rows a stale sessionId might otherwise match.
      if (current !== requestId.current) return
      setSession(null)
      setExercises([])
      setSets([])
      setLoading(false)
      return
    }

    const { data: exerciseRows } = await supabase
      .from('workout_session_exercises')
      .select('id, exercise_id, reihenfolge, ziel_saetze, ziel_wiederholungen, pausenzeit_sekunden, exercises(id, name)')
      .eq('workout_session_id', sessionId)
      .order('reihenfolge', { ascending: true })

    const { data: setRows } = await supabase
      .from('workout_session_sets')
      .select(
        'id, exercise_id, satz_nummer, gewicht, wiederholungen, rir, ist_aufwaermsatz, abgeschlossen_am, exercises(id, name, met_wert)',
      )
      .eq('workout_session_id', sessionId)
      .order('abgeschlossen_am', { ascending: true })

    if (current !== requestId.current) return

    setSession(sessionData as SessionInfo | null)
    setExercises(
      ((exerciseRows ?? []) as unknown as RawSessionExercise[]).map((row) => ({
        id: row.id,
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
        rir: row.rir,
        ist_aufwaermsatz: row.ist_aufwaermsatz,
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
  async function logSet(exerciseId: string, satzNummer: number, values: SetValues) {
    const { error } = await supabase.from('workout_session_sets').insert({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      // Plain running order over every set of this exercise, warm-ups included.
      // The "set 1 of 3" counting is derived in the UI from working sets alone.
      satz_nummer: satzNummer,
      ...values,
      abgeschlossen_am: new Date().toISOString(),
    })
    if (error) throw new Error('log set failed')
    await reload()
  }

  async function updateSet(
    setId: string,
    patch: Partial<Pick<SessionSet, 'gewicht' | 'wiederholungen' | 'rir' | 'ist_aufwaermsatz'>>,
  ) {
    const { error } = await supabase.from('workout_session_sets').update(patch).eq('id', setId)
    if (error) throw new Error('update set failed')
    await reload()
  }

  /**
   * Session-scoped only — never touches workout_plan_day_exercises, so the
   * plan itself is unaffected (see the design spec). reihenfolge is computed
   * from the currently loaded exercises in one snapshot, then written in a
   * single array insert — never a loop of single inserts, which would repeat
   * the same closure bug already found and fixed for addExercisesToDay.
   */
  async function addExercisesToSession(exerciseIds: string[]) {
    const nextReihenfolge = exercises.length === 0 ? 1 : Math.max(...exercises.map((entry) => entry.reihenfolge)) + 1
    const rows = exerciseIds.map((exerciseId, index) => ({
      workout_session_id: sessionId,
      exercise_id: exerciseId,
      reihenfolge: nextReihenfolge + index,
      ziel_saetze: null,
      ziel_wiederholungen: null,
      pausenzeit_sekunden: null,
    }))
    const { error } = await supabase.from('workout_session_exercises').insert(rows)
    if (error) throw new Error('add exercises to session failed')
    await reload()
  }

  async function removeExerciseFromSession(sessionExerciseId: string) {
    const { error } = await supabase.from('workout_session_exercises').delete().eq('id', sessionExerciseId)
    if (error) throw new Error('remove exercise from session failed')
    await reload()
  }

  async function completeSession(gewichtKg: number): Promise<{ beendetAm: string; gesamtKalorien: number | null }> {
    const beendetAm = new Date().toISOString()
    // Trained time runs to the last completed set, not to whenever the user
    // remembers to press the button — a session finished the next morning
    // would otherwise be billed as many hours of exercise.
    // Compared as parsed instants, not as strings: two timestamps with
    // different UTC offsets sort wrongly in lexicographic order.
    const lastSetAt = sets.reduce<number | null>((latest, set) => {
      if (set.abgeschlossen_am == null) return latest
      const at = Date.parse(set.abgeschlossen_am)
      return Number.isNaN(at) || (latest != null && at <= latest) ? latest : at
    }, null)
    const startedAt = new Date(session?.gestartet_am ?? beendetAm).getTime()
    const endedAt = lastSetAt ?? new Date(beendetAm).getTime()
    const dauerStunden = Math.max(0, endedAt - startedAt) / 1000 / 60 / 60
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
    return { beendetAm, gesamtKalorien }
  }

  /**
   * Compares the just-finished session's best estimated 1RM per exercise
   * against the best 1RM from every OTHER session of this user. RLS on
   * workout_session_sets already restricts the query to the user's own rows
   * (see 0001_initial_schema.sql's exists-subquery-against-workout_sessions
   * policy), so no session-id prefetch is needed here.
   */
  async function ermittleNeueRekorde(): Promise<NeuerRekord[]> {
    const betroffeneIds = [...new Set(sets.filter((set) => !set.ist_aufwaermsatz).map((set) => set.exercise_id))]
    if (betroffeneIds.length === 0) return []

    const { data, error } = await supabase
      .from('workout_session_sets')
      .select('exercise_id, gewicht, wiederholungen')
      .in('exercise_id', betroffeneIds)
      .eq('ist_aufwaermsatz', false)
      .neq('workout_session_id', sessionId)
    if (error) throw new Error('determine new records failed')

    const vorherigeBeste = new Map<string, number>()
    for (const row of (data ?? []) as {
      exercise_id: string
      gewicht: number | null
      wiederholungen: number | null
    }[]) {
      const einsRM = epley1RM(row.gewicht, row.wiederholungen)
      if (einsRM == null) continue
      // Rounded the same way neuePersoenlicheRekorde rounds the session's own
      // best — otherwise float noise (e.g. 116.70000000000002 vs 116.7) could
      // report a "new" record that only differs by a rounding artifact.
      const gerundet = Math.round(einsRM * 10) / 10
      const bisher = vorherigeBeste.get(row.exercise_id)
      if (bisher == null || gerundet > bisher) vorherigeBeste.set(row.exercise_id, gerundet)
    }

    const sessionSetsForCheck = sets
      .filter((set) => betroffeneIds.includes(set.exercise_id))
      .map((set) => ({
        exercise_id: set.exercise_id,
        name: set.exercise?.name ?? '',
        gewicht: set.gewicht,
        wiederholungen: set.wiederholungen,
        ist_aufwaermsatz: set.ist_aufwaermsatz,
      }))

    return neuePersoenlicheRekorde(sessionSetsForCheck, vorherigeBeste)
  }

  async function deleteSession() {
    const { error } = await supabase.from('workout_sessions').delete().eq('id', sessionId)
    if (error) throw new Error('delete session failed')
  }

  return {
    session,
    exercises,
    sets,
    loading,
    logSet,
    updateSet,
    completeSession,
    ermittleNeueRekorde,
    deleteSession,
    addExercisesToSession,
    removeExerciseFromSession,
  }
}
