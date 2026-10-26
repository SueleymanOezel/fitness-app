import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type GesternEintrag = { product_id: string; menge: number; mahlzeit: number }

/** Yesterday as a local calendar day, half-open like todayRange. */
export function gesternRange(jetzt = new Date()) {
  const start = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() - 1)
  const end = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate())
  return { start: start.toISOString(), end: end.toISOString() }
}

/**
 * Yesterday's meals, only what a copy needs (product, amount, meal): "Von gestern übernehmen" then
 * shows only where there is something to take over, and the copy needs no second read. Entries
 * without a meal or a product are left out; they have nowhere to go.
 */
export function useGesternEintraege(userId: string) {
  const [eintraege, setEintraege] = useState<GesternEintrag[]>([])

  useEffect(() => {
    let aktuell = true
    const { start, end } = gesternRange()
    supabase
      .from('food_entries')
      .select('product_id, menge, mahlzeit')
      .eq('user_id', userId)
      .gte('zeitpunkt', start)
      .lt('zeitpunkt', end)
      .not('mahlzeit', 'is', null)
      .not('product_id', 'is', null)
      .order('zeitpunkt', { ascending: true })
      .then(({ data, error }) => {
        // A failed read only hides the shortcut; the day can still be entered by hand.
        if (aktuell && !error) setEintraege((data ?? []) as GesternEintrag[])
      })
    return () => {
      aktuell = false
    }
  }, [userId])

  return { eintraege }
}
