import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FavoritZutat = { product_id: string; menge: number; name: string; kalorien: number | null }
export type Favorit = { id: string; name: string; zutaten: FavoritZutat[] }

type Zeile = {
  id: string
  name: string
  meal_favorite_items: { product_id: string; menge: number; reihenfolge: number; products: { name: string; kalorien: number | null } | null }[]
}

/**
 * Saved meals ("Mein Frühstück"), each with its foods and fixed amounts, read in one request with
 * the items embedded. Loaded only where something is added, so no page pays for it otherwise.
 */
export function useMahlzeitFavoriten(userId: string) {
  const [favoriten, setFavoriten] = useState<Favorit[]>([])

  const lesen = useCallback(async (): Promise<Favorit[] | null> => {
    const { data, error } = await supabase
      .from('meal_favorites')
      .select('id, name, meal_favorite_items(product_id, menge, reihenfolge, products(name, kalorien))')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    // A failed read only hides the favorites; adding one food by hand still works.
    if (error) return null
    return ((data ?? []) as unknown as Zeile[]).map((zeile) => ({
      id: zeile.id,
      name: zeile.name,
      zutaten: [...zeile.meal_favorite_items]
        .sort((a, b) => a.reihenfolge - b.reihenfolge)
        .map((item) => ({
          product_id: item.product_id,
          menge: item.menge,
          name: item.products?.name ?? 'Unbekannt',
          kalorien: item.products?.kalorien ?? null,
        })),
    }))
  }, [userId])

  useEffect(() => {
    let aktiv = true
    void lesen().then((neu) => {
      if (aktiv && neu) setFavoriten(neu)
    })
    return () => {
      aktiv = false
    }
  }, [lesen])

  async function reload() {
    const neu = await lesen()
    if (neu) setFavoriten(neu)
  }

  /** The favorite first, then its items; if the items fail, the empty favorite is removed again. */
  async function speichern(name: string, zutaten: { product_id: string; menge: number }[]) {
    const { data, error } = await supabase
      .from('meal_favorites')
      .insert({ user_id: userId, name: name.trim() })
      .select('id')
      .single()
    if (error || !data) throw new Error('favorite insert failed')
    const favoritId = (data as { id: string }).id
    const { error: itemError } = await supabase.from('meal_favorite_items').insert(
      zutaten.map((zutat, index) => ({ favorite_id: favoritId, product_id: zutat.product_id, menge: zutat.menge, reihenfolge: index })),
    )
    if (itemError) {
      await supabase.from('meal_favorites').delete().eq('id', favoritId)
      throw new Error('favorite items insert failed')
    }
    await reload()
  }

  async function loeschen(id: string) {
    const { error } = await supabase.from('meal_favorites').delete().eq('id', id)
    if (error) throw new Error('favorite delete failed')
    await reload()
  }

  return { favoriten, speichern, loeschen }
}
