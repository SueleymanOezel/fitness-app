import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
import FavoritenListe from './FavoritenListe'

const fruehstueck = { id: 'f1', name: 'Mein Frühstück', zutaten: [{ product_id: 'p1', menge: 80, name: 'Hafer', kalorien: 372 }] }
vi.mock('../hooks/use-meal-favorites', () => ({
  useMahlzeitFavoriten: () => ({ favoriten: [fruehstueck], speichern: vi.fn(), loeschen: vi.fn().mockResolvedValue(undefined) }),
}))

describe('FavoritenListe', () => {
  // Re-audit 27.10.2026: a red "Löschen" sat next to the favorite in the add dialog, in the thumb's path.
  it('only enters a favorite in an add dialog, without a delete next to it', () => {
    const onWaehlen = vi.fn()
    renderWithProviders(<FavoritenListe userId="u1" onWaehlen={onWaehlen} />)
    fireEvent.click(screen.getByRole('button', { name: /Mein Frühstück/ }))
    expect(onWaehlen).toHaveBeenCalledWith(fruehstueck)
    expect(screen.queryByRole('button', { name: /löschen/i })).not.toBeInTheDocument()
  })

  it('manages favorites where it is not an add dialog: delete, nothing to tap on the row', () => {
    renderWithProviders(<FavoritenListe userId="u1" />)
    expect(screen.getByRole('heading', { name: 'Deine Favoriten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Favorit Mein Frühstück löschen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Mein Frühstück/ })).not.toBeInTheDocument()
  })
})
