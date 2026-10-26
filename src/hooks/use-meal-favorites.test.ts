import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

const aufrufe: { tabelle: string; art: string; wert?: unknown }[] = []
let itemsFehler: unknown = null
let gelesen: unknown[] = []

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (tabelle: string) => {
      let ergebnis: { data: unknown; error: unknown } = { data: gelesen, error: null }
      const b: Record<string, unknown> = {}
      b.select = () => b
      b.order = () => b
      b.eq = (_spalte: string, wert: unknown) => {
        aufrufe.push({ tabelle, art: 'eq', wert })
        return b
      }
      b.single = () => b
      b.insert = (wert: unknown) => {
        aufrufe.push({ tabelle, art: 'insert', wert })
        ergebnis = tabelle === 'meal_favorites' ? { data: { id: 'fav1' }, error: null } : { data: null, error: itemsFehler }
        return b
      }
      b.delete = () => {
        aufrufe.push({ tabelle, art: 'delete' })
        return b
      }
      b.then = (resolve: (value: unknown) => unknown) => Promise.resolve(ergebnis).then(resolve)
      return b
    },
  },
}))

describe('useMahlzeitFavoriten', () => {
  it('hides a favorite whose products were all deleted', async () => {
    gelesen = [
      { id: 'a', name: 'Leer', meal_favorite_items: [] },
      { id: 'b', name: 'Voll', meal_favorite_items: [{ product_id: 'p1', menge: 80, reihenfolge: 0, products: { name: 'Hafer', kalorien: 372 } }] },
    ]
    const { useMahlzeitFavoriten } = await import('./use-meal-favorites')
    const { result } = renderHook(() => useMahlzeitFavoriten('u1'))
    await waitFor(() => expect(result.current.favoriten.map((f) => f.name)).toEqual(['Voll']))
    gelesen = []
  })

  it('saves the favorite with its items in order', async () => {
    aufrufe.length = 0
    itemsFehler = null
    const { useMahlzeitFavoriten } = await import('./use-meal-favorites')
    const { result } = renderHook(() => useMahlzeitFavoriten('u1'))
    await result.current.speichern('  Mein Frühstück ', [
      { product_id: 'p1', menge: 80 },
      { product_id: 'p2', menge: 250 },
    ])
    expect(aufrufe).toContainEqual({ tabelle: 'meal_favorites', art: 'insert', wert: { user_id: 'u1', name: 'Mein Frühstück' } })
    expect(aufrufe).toContainEqual({
      tabelle: 'meal_favorite_items',
      art: 'insert',
      wert: [
        { favorite_id: 'fav1', product_id: 'p1', menge: 80, reihenfolge: 0 },
        { favorite_id: 'fav1', product_id: 'p2', menge: 250, reihenfolge: 1 },
      ],
    })
  })

  it('removes the empty favorite again when its items cannot be saved', async () => {
    aufrufe.length = 0
    itemsFehler = { message: 'x' }
    const { useMahlzeitFavoriten } = await import('./use-meal-favorites')
    const { result } = renderHook(() => useMahlzeitFavoriten('u1'))
    await waitFor(() => expect(aufrufe.length).toBeGreaterThan(0))
    await expect(result.current.speichern('Mittag', [{ product_id: 'p1', menge: 100 }])).rejects.toThrow()
    expect(aufrufe).toContainEqual({ tabelle: 'meal_favorites', art: 'delete' })
    expect(aufrufe).toContainEqual({ tabelle: 'meal_favorites', art: 'eq', wert: 'fav1' })
  })
})
