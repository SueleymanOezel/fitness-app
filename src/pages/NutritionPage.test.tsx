import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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

describe('NutritionPage', () => {
  it('shows a loading state while profile or entries are loading', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: null, loading: true, updateProfile: vi.fn() })
    mockUseFoodEntries.mockReturnValue({
      entries: [],
      loading: true,
      addEntry: vi.fn(),
      updateEntryMenge: vi.fn(),
      deleteEntry: vi.fn(),
    })

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />)

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders the dashboard sections once profile and entries are loaded', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile, loading: false, updateProfile: vi.fn() })
    mockUseFoodEntries.mockReturnValue({
      entries: [],
      loading: false,
      addEntry: vi.fn(),
      updateEntryMenge: vi.fn(),
      deleteEntry: vi.fn(),
    })

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />)

    expect(screen.getByRole('heading', { name: 'Ernährung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument()
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Barcode scannen' })).toBeInTheDocument()
  })
})
