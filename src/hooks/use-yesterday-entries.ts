import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { localDay } from '../lib/local-time'

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
  // Keyed by user and day: rows of another account, or of the day before yesterday after midnight,
  // never pass for this user's yesterday, even before the new read has answered (or if it fails).
  const schluessel = `${userId}@${localDay(new Date().toISOString())}`
  const [geladen, setGeladen] = useState<{ schluessel: string; eintraege: GesternEintrag[] } | null>(null)

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
        if (aktuell && !error) setGeladen({ schluessel, eintraege: (data ?? []) as GesternEintrag[] })
      })
    return () => {
      aktuell = false
    }
  }, [userId, schluessel])

  return { eintraege: geladen?.schluessel === schluessel ? geladen.eintraege : [] }
}
