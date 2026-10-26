import { useToast } from '../components/ToastProvider'
import type { Favorit } from './use-meal-favorites'

type Zeile = { product_id: string; menge: number; mahlzeit: number }

/**
 * Enters a whole favorite into one meal, then offers „Rückgängig“ like "Von gestern übernehmen".
 * The caller closes its dialog first: a toast would sit behind the open dialog's top layer.
 */
export function useFavoritEintragen(addEntries: (rows: Zeile[]) => Promise<string[]>, removeEntries: (ids: string[]) => Promise<void>) {
  const showToast = useToast()
  return async (favorit: Favorit, mahlzeit: number) => {
    try {
      const ids = await addEntries(favorit.zutaten.map((zutat) => ({ product_id: zutat.product_id, menge: zutat.menge, mahlzeit })))
      showToast(`„${favorit.name}“ eingetragen.`, 'success', {
        label: 'Rückgängig',
        onClick: () => void removeEntries(ids).catch(() => showToast('Konnte nicht rückgängig gemacht werden.', 'error')),
      })
    } catch {
      showToast(`„${favorit.name}“ konnte nicht eingetragen werden.`, 'error')
    }
  }
}
