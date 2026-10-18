import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PRODUCT_COLUMNS, type Product } from '../lib/product-lookup'
import { useStaleState } from './use-stale-state'

/** A product the user has eaten before, with the amount of the last time. */
export type ZuletztGegessen = { product: Product; letzteMenge: number }

const ZULETZT_ANZAHL = 8

/**
 * Most meals repeat: the products of the user's own recent entries, newest first
 * and each once, with the amount eaten last time. Kept as a last-known copy so
 * the list is there at once (and offline).
 */
export function useZuletztGegessen(userId: string | undefined) {
  const { daten, gelungen } = useStaleState<ZuletztGegessen[]>(userId ?? '-', 'recent-products', [])

  useEffect(() => {
    if (!userId) return
    let aktuell = true
    supabase
      .from('food_entries')
      .select(`menge, zeitpunkt, products(${PRODUCT_COLUMNS})`)
      .eq('user_id', userId)
      .not('product_id', 'is', null)
      .order('zeitpunkt', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!aktuell || error) return
        const gesehen = new Set<string>()
        const liste: ZuletztGegessen[] = []
        for (const row of (data ?? []) as unknown as { menge: number; products: Product | null }[]) {
          if (!row.products || gesehen.has(row.products.id)) continue
          gesehen.add(row.products.id)
          liste.push({ product: row.products, letzteMenge: row.menge })
          if (liste.length >= ZULETZT_ANZAHL * 4) break
        }
        gelungen(liste)
      })
    return () => {
      aktuell = false
    }
  }, [userId, gelungen])

  return daten
}

/** PostgREST filter syntax uses , ( ) and * — a typed name must not be able to change the query. */
function bereinigt(suche: string) {
  return suche.replace(/[,()*%\\]/g, ' ').trim()
}

/**
 * Name search over products the user may sensibly pick: their own, and the
 * shared barcode products (Open Food Facts cache). Other users' private,
 * barcode-less products stay out — they are someone's personal entries, not a
 * catalogue. Debounced; fewer than 2 characters search nothing.
 */
export function useProduktSuche(userId: string | undefined, suche: string) {
  const [ergebnis, setErgebnis] = useState<{ suche: string; produkte: Product[] } | null>(null)
  const begriff = bereinigt(suche)

  useEffect(() => {
    if (!userId || begriff.length < 2) return
    let aktuell = true
    const timer = setTimeout(() => {
      supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .ilike('name', `%${begriff}%`)
        .or(`created_by.eq.${userId},barcode.not.is.null`)
        .order('name', { ascending: true })
        .limit(20)
        .then(({ data, error }) => {
          if (!aktuell) return
          setErgebnis({ suche: begriff, produkte: error ? [] : ((data ?? []) as Product[]) })
        })
    }, 250)
    return () => {
      aktuell = false
      clearTimeout(timer)
    }
  }, [userId, begriff])

  const fertig = ergebnis !== null && ergebnis.suche === begriff
  return { produkte: fertig ? ergebnis.produkte : [], laedt: begriff.length >= 2 && !fertig }
}
