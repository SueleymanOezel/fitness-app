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

export function useExercises(userId: string) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    // A create-triggered reload can be answered before the initial one; only
    // the newest request may write state (and none may write after unmount).
    const current = ++requestId.current

    // Paged: the imported library alone is ~873 rows and PostgREST caps a
    // response at db-max-rows (1000 by default) without reporting it — an
    // unpaged read would silently drop everything past the cut-off.
    const all: Exercise[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      if (error) break
      const page = (data ?? []) as Exercise[]
      all.push(...page)
      if (page.length < PAGE_SIZE) break
    }

    if (current !== requestId.current) return
    setExercises(all)
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

  return { exercises, loading, createExercise }
}
