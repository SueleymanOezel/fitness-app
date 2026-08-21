import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FoodEntry = {
  id: string
  menge: number
  zeitpunkt: string
  product_id: string | null
  mahlzeit: number | null
  products: {
    id: string
    name: string
    barcode: string | null
    created_by: string | null
    kalorien: number
    eiweiss: number | null
    fett: number | null
    kohlenhydrate: number | null
  } | null
}

export type EntryPatch = {
  menge?: number
  zeitpunkt?: string
  product_id?: string
  mahlzeit?: number | null
}

/** Local calendar day, half-open — an entry at 23:59:59.4 still belongs to today. */
export function todayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function useFoodEntries(userId: string) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const requestId = useRef(0)

  const reload = useCallback(async () => {
    // Two quick deletes can have their reloads answered out of order; only the
    // newest request may write state (and none may write after unmount).
    const current = ++requestId.current
    const { start, end } = todayRange()
    const { data } = await supabase
      .from('food_entries')
      .select(
        'id, menge, zeitpunkt, product_id, mahlzeit, products(id, name, barcode, created_by, kalorien, eiweiss, fett, kohlenhydrate)',
      )
      .eq('user_id', userId)
      .gte('zeitpunkt', start)
      .lt('zeitpunkt', end)
      .order('zeitpunkt', { ascending: true })
    if (current !== requestId.current) return
    setEntries((data ?? []) as unknown as FoodEntry[])
    setLoading(false)
  }, [userId])

  useEffect(() => {
    const tracker = requestId
    reload()
    return () => {
      tracker.current++ // invalidate the in-flight request on unmount
    }
  }, [reload])

  // supabase-js resolves rather than throws on a rejected write, so an unchecked
  // error would let the UI report success while nothing was stored.
  async function addEntry(productId: string, menge: number, mahlzeit: number | null) {
    const { error } = await supabase
      .from('food_entries')
      .insert({ user_id: userId, product_id: productId, menge, mahlzeit })
    if (error) throw new Error('insert failed')
    await reload()
  }

  async function updateEntry(entryId: string, patch: EntryPatch) {
    const { error } = await supabase.from('food_entries').update(patch).eq('id', entryId)
    if (error) throw new Error('update failed')
    await reload()
  }

  async function deleteEntry(entryId: string) {
    const { error } = await supabase.from('food_entries').delete().eq('id', entryId)
    if (error) throw new Error('delete failed')
    await reload()
  }

  return { entries, loading, addEntry, updateEntry, deleteEntry }
}
