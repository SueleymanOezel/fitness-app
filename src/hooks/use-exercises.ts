import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStaleState } from './use-stale-state'

export type Exercise = {
  id: string
  name: string
  name_de: string | null
  kategorie: string | null
  equipment: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  bild_url: string | null
  schwierigkeitsgrad: string | null
  met_wert: number | null
  created_by: string | null
}

export type NewExercise = {
  name: string
  kategorie: string
  met_wert: number
  equipment?: string
  muskelgruppen_primaer?: string[]
  muskelgruppen_sekundaer?: string[]
  bild_url?: string
  anleitung?: string[]
  schwierigkeitsgrad?: string
}

/**
 * The list never shows the step-by-step instructions, and they are by far the
 * biggest part of a row (~1.1 of ~1.4 MB for the whole library). They are read
 * on demand for one exercise (useExerciseInstructions), not with every list.
 */
const LIST_COLUMNS =
  'id, name, name_de, kategorie, equipment, muskelgruppen_primaer, muskelgruppen_sekundaer, bild_url, schwierigkeitsgrad, met_wert, created_by'

const PAGE_SIZE = 500
/** Stops a misconfigured db-max-rows from turning the loop into an endless one. */
const MAX_PAGES = 40

export function useExercises(userId: string) {
  const { daten: exercises, loading, gelungen, gescheitert } = useStaleState<Exercise[]>(userId, 'exercises', [])
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    // A create-triggered reload can be answered before the initial one; only
    // the newest request may write state (and none may write after unmount).
    const current = ++requestId.current

    // Paged: the imported library alone is ~873 rows and PostgREST caps a
    // response at db-max-rows (1000 by default) without reporting it — an
    // unpaged read would silently drop everything past the cut-off.
    const all: Exercise[] = []
    let failed = false
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const from = page * PAGE_SIZE
      const { data, error: pageError } = await supabase
        .from('exercises')
        .select(LIST_COLUMNS)
        // id as a tiebreaker: names are not unique, and without a total order
        // a row on a page boundary can come back twice or not at all.
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      // A failed page must be reported, not served as a complete library.
      if (pageError) {
        failed = true
        break
      }
      const rows = (data ?? []) as Exercise[]
      all.push(...rows)
      if (rows.length < PAGE_SIZE) break
    }

    if (current !== requestId.current) return
    // With a last-known copy (offline) the old library stays and is not an error.
    const fehlerAnzeigen = failed ? !gescheitert([]) : (gelungen(all), false)
    setError(fehlerAnzeigen)
  }, [gelungen, gescheitert])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function createExercise(input: NewExercise) {
    const { error } = await supabase.from('exercises').insert({ created_by: userId, ...input })
    if (error) throw new Error('create exercise failed')
    await reload()
  }

  return { exercises, loading, error, createExercise }
}

/** Instructions of one exercise, loaded when its detail dialog opens. */
export function useExerciseInstructions(exerciseId: string) {
  const [state, setState] = useState<{ id: string; anleitung: string[]; failed: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('exercises')
      .select('anleitung, anleitung_de')
      .eq('id', exerciseId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        const row = data as { anleitung: string[] | null; anleitung_de: string[] | null } | null
        setState({ id: exerciseId, anleitung: row?.anleitung_de ?? row?.anleitung ?? [], failed: Boolean(error) })
      })
    return () => {
      cancelled = true
    }
  }, [exerciseId])

  const current = state?.id === exerciseId ? state : null
  return { anleitung: current?.anleitung ?? [], loading: current === null, error: current?.failed ?? false }
}
