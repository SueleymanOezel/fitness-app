import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { FoodEntry } from '../hooks/use-food-entries'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({
  useFoodEntries: (userId: string) => mockUseFoodEntries(userId),
}))

const entry: FoodEntry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-19T12:00:00Z',
  product_id: 'p1',
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
  mockUseFoodEntries.mockReturnValue(result)
  const { default: NutritionEntriesPage } = await import('./NutritionEntriesPage')
  render(<NutritionEntriesPage />, { wrapper: MemoryRouter })
  return result
}

describe('NutritionEntriesPage', () => {
  it("lists today's entries", async () => {
    await renderPage()

    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByLabelText('Menge (g) für Testprodukt')).toHaveValue(150)
  })

  it('changes an entry amount', async () => {
    const result = await renderPage()

    const input = screen.getByLabelText('Menge (g) für Testprodukt')
    fireEvent.change(input, { target: { value: '200' } })
    fireEvent.blur(input)

    await waitFor(() => expect(result.updateEntry).toHaveBeenCalledWith('e1', { menge: 200 }))
  })

  it('deletes an entry', async () => {
    const result = await renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    await waitFor(() => expect(result.deleteEntry).toHaveBeenCalledWith('e1'))
  })

  it('shows the empty state when nothing was logged yet', async () => {
    await renderPage(entriesResult({ entries: [] }))

    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('shows a loading state while entries are loading', async () => {
    await renderPage(entriesResult({ loading: true, entries: [] }))

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('links back to the nutrition dashboard', async () => {
    await renderPage()

    expect(screen.getByRole('link', { name: /Ernährung/ })).toHaveAttribute('href', '/nutrition')
  })
})
