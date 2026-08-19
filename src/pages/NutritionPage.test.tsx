import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({
  useFoodEntries: (userId: string) => mockUseFoodEntries(userId),
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
}

// Mirrors the real hook's return shape so a page branch cannot pass against a
// mock that no longer matches useProfile.
function profileResult(overrides: Record<string, unknown>) {
  return { profile: null, loading: false, error: false, reload: vi.fn(), updateProfile: vi.fn(), ...overrides }
}

function entriesResult(overrides: Record<string, unknown> = {}) {
  return {
    entries: [],
    loading: false,
    addEntry: vi.fn(),
    updateEntryMenge: vi.fn(),
    deleteEntry: vi.fn(),
    ...overrides,
  }
}

describe('NutritionPage', () => {
  it('shows a loading state while profile or entries are loading', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ loading: true }))
    mockUseFoodEntries.mockReturnValue(entriesResult({ loading: true }))

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders the dashboard sections once profile and entries are loaded', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('heading', { name: 'Ernährung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument()
    
    expect(screen.getByRole('button', { name: 'Barcode scannen' })).toBeInTheDocument()
  })

  it('offers a retry instead of loading forever when the profile cannot be loaded', async () => {
    const reload = vi.fn()
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ error: true, reload }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    expect(screen.getByRole('alert')).toHaveTextContent('Profil konnte nicht geladen werden')
    screen.getByRole('button', { name: 'Erneut versuchen' }).click()
    expect(reload).toHaveBeenCalled()
  })

  it('leaves the entry list to its own page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // The dashboard keeps the balance and the capture flow; the list lives on /nutrition/entries.
    expect(screen.queryByText('Noch keine Einträge heute.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Einträge/ })).toHaveAttribute(
      'href',
      '/nutrition/entries',
    )
    expect(screen.getByRole('button', { name: 'Barcode scannen' })).toBeInTheDocument()
  })

  it('leaves goal editing to the profile page', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // The dashboard shows the goal, it does not edit it — editing lives on /profile.
    expect(screen.queryByRole('button', { name: 'Manuell festlegen' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tagesziel (kcal)')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profil/ })).toBeInTheDocument()
  })

  it('passes the manual calorie goal through to the daily summary', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // 2000 is the manual override, not the Mifflin-St-Jeor value (2759) for this profile.
    expect(screen.getByText(/Ziel 2000 kcal/)).toBeInTheDocument()
  })
})
