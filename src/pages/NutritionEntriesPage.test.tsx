import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FoodEntry } from '../hooks/use-food-entries'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({
  useFoodEntries: (userId: string) => mockUseFoodEntries(userId),
}))

// The edit form saves the product's nutrients before saving the entry itself;
// this page's test only cares about the entry-level save, so the product save
// is stubbed to succeed without hitting the real Supabase client.
vi.mock('../lib/product-edit', () => ({
  saveProductEdit: vi.fn().mockResolvedValue({ id: 'p1' }),
}))

vi.mock('../lib/product-lookup', () => ({
  findOrFetchProductByBarcode: () =>
    Promise.resolve({ id: 'p1', name: 'Testprodukt', barcode: '8076809580144', kalorien: 100 }),
}))

const profile = {
  id: 'u1',
  name: null,
  alter: 30,
  groesse: 180,
  aktuelles_gewicht: 80,
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  taegliches_kalorienziel: 2000,
  mahlzeit_1_name: 'Frühstück',
  mahlzeit_2_name: 'Mittagessen',
  mahlzeit_3_name: 'Abendessen',
  mahlzeit_4_name: 'Snacks',
  mahlzeit_5_name: null,
  mahlzeit_6_name: null,
}

// Mirrors the real hook's return shape so a page branch cannot pass against a
// mock that no longer matches useProfile.
function profileResult(overrides: Record<string, unknown> = {}) {
  return { profile, loading: false, error: false, reload: vi.fn(), updateProfile: vi.fn(), ...overrides }
}

const entry: FoodEntry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-19T12:00:00Z',
  product_id: 'p1',
  mahlzeit: null,
  products: {
    id: 'p1',
    name: 'Testprodukt',
    barcode: null,
    created_by: 'u1',
    kalorien: 100,
    eiweiss: 1,
    fett: 2,
    kohlenhydrate: 3,
  },
}

function entriesResult(overrides: Record<string, unknown> = {}) {
  return {
    entries: [entry],
    loading: false,
    addEntry: vi.fn().mockResolvedValue(undefined),
    updateEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

async function renderPage(result = entriesResult()) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue(profileResult())
  mockUseFoodEntries.mockReturnValue(result)
  const { default: NutritionEntriesPage } = await import('./NutritionEntriesPage')
  render(<NutritionEntriesPage />, { wrapper: MemoryRouter })
  return result
}

describe('NutritionEntriesPage', () => {
  it("lists today's entries", async () => {
    await renderPage()

    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByText(/150 g/)).toBeInTheDocument()
  })

  it('changes an entry amount through the edit form', async () => {
    const result = await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Bearbeiten' }))
    fireEvent.change(screen.getByLabelText('Menge (g)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateEntry).toHaveBeenCalledWith('e1', expect.objectContaining({ menge: 200 })),
    )
  })

  it('deletes an entry', async () => {
    const result = await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(result.deleteEntry).toHaveBeenCalledWith('e1'))
  })

  it('shows the empty state when nothing was logged yet', async () => {
    await renderPage(entriesResult({ entries: [] }))

    // One per active section — the unassigned group only shows when it holds entries.
    expect(screen.getAllByText('Noch keine Einträge heute.').length).toBeGreaterThan(0)
  })

  it('shows a loading state while entries are loading', async () => {
    await renderPage(entriesResult({ loading: true, entries: [] }))

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('links back to the nutrition dashboard', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: /Ernährung/ })).toHaveAttribute('href', '/nutrition')
  })

  it('groups the entries by section and sums each one', async () => {
    await renderPage(
      entriesResult({
        entries: [
          { ...entry, id: 'e1', mahlzeit: 1, menge: 150 },
          { ...entry, id: 'e2', mahlzeit: 2, menge: 50 },
        ],
      }),
    )

    const fruehstueck = screen.getByRole('heading', { name: /Frühstück/ })
    // 100 kcal per 100 g × 150 g
    expect(fruehstueck).toHaveTextContent('150 kcal')
    expect(screen.getByRole('heading', { name: /Mittagessen/ })).toHaveTextContent('50 kcal')
  })

  it('files a new entry under the section it was added from', async () => {
    const result = await renderPage(entriesResult({ entries: [] }))

    // Two sections, so a hard-coded slot cannot pass.
    const addButtons = screen.getAllByRole('button', { name: 'Barcode scannen' })
    expect(addButtons.length).toBeGreaterThan(1)

    fireEvent.change(screen.getAllByLabelText('Barcode-Nummer eingeben')[1], {
      target: { value: '8076809580144' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: 'Suchen' })[1])

    await waitFor(() => expect(screen.getAllByLabelText('Menge (g)').length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByRole('button', { name: 'Hinzufügen' })[0])

    await waitFor(() => expect(result.addEntry).toHaveBeenCalled())
    expect(result.addEntry).toHaveBeenCalledWith('p1', 100, 2)
  })

  it('shows unassigned entries in their own group at the end', async () => {
    await renderPage(entriesResult({ entries: [{ ...entry, mahlzeit: null }] }))

    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent ?? '')
    expect(headings[headings.length - 1]).toContain('Ohne Zuordnung')
  })
})
