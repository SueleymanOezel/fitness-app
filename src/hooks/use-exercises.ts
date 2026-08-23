import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type Exercise = {
  id: string
  name: string
  kategorie: string | null
  equipment: string | null
  muskelgruppen_primaer: string[] | null
  muskelgruppen_sekundaer: string[] | null
  bild_url: string | null
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
}

const PAGE_SIZE = 500
/** Stops a misconfigured db-max-rows from turning the loop into an endless one. */
const MAX_PAGES = 40

export function useExercises(userId: string) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
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
        .select('*')
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
    setExercises(failed ? [] : all)
    setError(failed)
    setLoading(false)
  }, [])

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
