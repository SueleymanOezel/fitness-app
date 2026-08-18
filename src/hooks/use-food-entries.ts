import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FoodEntry = {
  id: string
  menge: number
  zeitpunkt: string
  products: {
    name: string
    kalorien: number
    eiweiss: number | null
    fett: number | null
    kohlenhydrate: number | null
  } | null
}

export function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function useFoodEntries(userId: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    const { start, end } = todayRange()
    const { data } = await supabase
      .from('food_entries')
      .select('id, menge, zeitpunkt, products(name, kalorien, eiweiss, fett, kohlenhydrate)')
      .eq('user_id', userId)
      .gte('zeitpunkt', start)
      .lte('zeitpunkt', end)
      .order('zeitpunkt', { ascending: true })
    setEntries((data ?? []) as unknown as FoodEntry[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // reload() only sets state after its internal `await`, never synchronously
    // during this effect's call stack; the compiler's static check cannot see
    // the await boundary through the named function call, so it conservatively
    // flags it.
    reload() // eslint-disable-line react-hooks/set-state-in-effect
  }, [reload])

  async function addEntry(productId: string, menge: number) {
    await supabase.from('food_entries').insert({ user_id: userId, product_id: productId, menge })
    await reload()
  }

  async function updateEntryMenge(entryId: string, menge: number) {
    await supabase.from('food_entries').update({ menge }).eq('id', entryId)
    await reload()
  }

  async function deleteEntry(entryId: string) {
    await supabase.from('food_entries').delete().eq('id', entryId)
    await reload()
  }

  return { entries, loading, addEntry, updateEntryMenge, deleteEntry }
}
