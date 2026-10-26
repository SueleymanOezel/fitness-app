import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import QuickAddDialog from './QuickAddDialog'
import { ToastProvider } from './ToastProvider'

const fruehstueck = { id: 'f1', name: 'Mein Frühstück', zutaten: [{ product_id: 'p1', menge: 80, name: 'Hafer', kalorien: 372 }, { product_id: 'p2', menge: 250, name: 'Skyr', kalorien: 63 }] }
const mockFavoriten = vi.fn(() => ({ favoriten: [] as (typeof fruehstueck)[], speichern: vi.fn(), loeschen: vi.fn() }))
vi.mock('../hooks/use-meal-favorites', () => ({ useMahlzeitFavoriten: () => mockFavoriten() }))

// ProductPicker (Barcode, Suche) ist hier nicht Gegenstand: der Stub meldet nur ein Produkt zurück.
vi.mock('./AddEntryFlow', () => ({
  default: ({ onAdd, onCancel }: { onAdd: (id: string, menge: number) => Promise<void>; onCancel?: () => void }) => (
    <div>
      <button type="button" onClick={() => onAdd('p1', 150).catch(() => {})}>
        Stub hinzufügen
      </button>
      <button type="button" onClick={onCancel}>
        Stub abbrechen
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const sections = [
  { slot: 1, name: 'Frühstück' },
  { slot: 2, name: 'Mittagessen' },
  { slot: 3, name: 'Abendessen' },
  { slot: 4, name: 'Snacks' },
]

function zeige(props: Partial<Parameters<typeof QuickAddDialog>[0]> = {}) {
  const onClose = vi.fn()
  const addEntry = vi.fn().mockResolvedValue(undefined)
  const addEntries = vi.fn().mockResolvedValue(['n1', 'n2'])
  const removeEntries = vi.fn().mockResolvedValue(undefined)
  render(
    <QuickAddDialog
      open
      onClose={onClose}
      sections={sections}
      addEntry={addEntry}
      userId="u1"
      addEntries={addEntries}
      removeEntries={removeEntries}
      {...props}
    />,
    {
      wrapper: ({ children }) => (
        <MemoryRouter>
          <ToastProvider>{children}</ToastProvider>
        </MemoryRouter>
      ),
    },
  )
  return { onClose, addEntry, addEntries, removeEntries }
}

describe('QuickAddDialog', () => {
  it('enters a whole favorite into the chosen meal in one tap, with undo', async () => {
    mockFavoriten.mockReturnValue({ favoriten: [fruehstueck], speichern: vi.fn(), loeschen: vi.fn() })
    onTestFinished(() => {
      mockFavoriten.mockReturnValue({ favoriten: [], speichern: vi.fn(), loeschen: vi.fn() })
    })
    const { onClose, addEntries, removeEntries } = zeige()
    fireEvent.click(screen.getByRole('button', { name: 'Mittagessen' }))
    fireEvent.click(screen.getByRole('button', { name: /Mein Frühstück.*2 Lebensmittel · 455 kcal/ }))
    expect(onClose).toHaveBeenCalled()
    await waitFor(() =>
      expect(addEntries).toHaveBeenCalledWith([
        { product_id: 'p1', menge: 80, mahlzeit: 2 },
        { product_id: 'p2', menge: 250, mahlzeit: 2 },
      ]),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Rückgängig' }))
    await waitFor(() => expect(removeEntries).toHaveBeenCalledWith(['n1', 'n2']))
  })

  it('rendert nichts, solange er geschlossen ist', () => {
    zeige({ open: false })
    expect(screen.queryByRole('group', { name: 'Mahlzeit' })).not.toBeInTheDocument()
  })

  it('belegt den Abschnitt nach Tageszeit vor', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12, 30))
    zeige()
    expect(screen.getByRole('button', { name: 'Mittagessen' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Frühstück' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('legt die Mahlzeit-Chips auf eine Karte', () => {
    zeige()
    expect(screen.getByRole('group', { name: 'Mahlzeit' }).parentElement).toHaveClass('bg-surface', 'rounded-3xl')
  })

  it('speichert in den gewählten Abschnitt und schließt', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 8, 0))
    const { addEntry, onClose } = zeige()
    fireEvent.click(screen.getByRole('button', { name: 'Snacks' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stub hinzufügen' }))
    await waitFor(() => expect(addEntry).toHaveBeenCalledWith('p1', 150, 4))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('bleibt offen, wenn das Speichern fehlschlägt', async () => {
    const addEntry = vi.fn().mockRejectedValue(new Error('boom'))
    const { onClose } = zeige({ addEntry })
    fireEvent.click(screen.getByRole('button', { name: 'Stub hinzufügen' }))
    await waitFor(() => expect(addEntry).toHaveBeenCalled())
    expect(onClose).not.toHaveBeenCalled()
  })

  it('zeigt ohne benannte Abschnitte einen Hinweis statt einer leeren Chip-Zeile', () => {
    zeige({ sections: [] })
    expect(screen.queryByRole('group', { name: 'Mahlzeit' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Stub hinzufügen' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profil/ })).toHaveAttribute('href', '/profile')
  })

  it('nennt die gewählte Mahlzeit im Titel und folgt dem Wechsel', () => {
    zeige()
    fireEvent.click(screen.getByRole('button', { name: 'Snacks' }))
    expect(screen.getByRole('heading', { name: 'Eintrag für Snacks' })).toBeInTheDocument()
  })
})
