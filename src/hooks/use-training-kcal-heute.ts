import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Calories burned by workouts finished today, for the calorie card. A failed
 * read just leaves it at 0 — the card then says nothing about training.
 */
export function useTrainingKcalHeute(userId: string) {
  const [kcal, setKcal] = useState(0)

  useEffect(() => {
    let aktuell = true
    const heute = new Date()
    heute.setHours(0, 0, 0, 0)
    supabase
      .from('workout_sessions')
      .select('gesamt_kalorien')
      .eq('user_id', userId)
      .gte('beendet_am', heute.toISOString())
      .then(({ data }) => {
        if (!aktuell) return
        const summe = ((data ?? []) as { gesamt_kalorien: number | null }[]).reduce(
          (acc, row) => acc + (row.gesamt_kalorien ?? 0),
          0,
        )
        setKcal(Math.round(summe))
      })
    return () => {
      aktuell = false
    }
  }, [userId])

  return kcal
}
