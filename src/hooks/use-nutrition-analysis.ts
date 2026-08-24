import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { rangeStart, type Zeitraum } from '../lib/analysis/zeitraum'

export type AnalysisFoodEntry = {
  zeitpunkt: string
  menge: number
  mahlzeit: number | null
  products: { kalorien: number; eiweiss: number; fett: number; kohlenhydrate: number } | null
}

// The macro columns come along although E1 only needs calories: E2 and E3 read
// the same query later, and widening it then would mean changing reviewed code.
const COLUMNS = 'zeitpunkt, menge, mahlzeit, products(kalorien, eiweiss, fett, kohlenhydrate)'

export function useNutritionAnalysis(userId: string, zeitraum: Zeitraum) {
  const [entries, setEntries] = useState<AnalysisFoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    const current = ++requestId.current
    let query = supabase.from('food_entries').select(COLUMNS).eq('user_id', userId)
    const start = rangeStart(zeitraum)
    // `zeitpunkt` is timestamptz and the bound is a date: Postgres reads it as
    // midnight of that day, which is the lower bound we want.
    if (start) query = query.gte('zeitpunkt', start)
    const { data, error: loadError } = await query.order('zeitpunkt', { ascending: true })
    if (current !== requestId.current) return
    setEntries((data ?? []) as unknown as AnalysisFoodEntry[])
    setError(Boolean(loadError))
    setLoading(false)
  }, [userId, zeitraum])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++
    }
  }, [reload])

  return { entries, loading, error }
}
