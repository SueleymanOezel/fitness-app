import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import HomePage from './HomePage'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({ useFoodEntries: (userId: string) => mockUseFoodEntries(userId) }))

const mockUseActiveTrainingDay = vi.fn()
vi.mock('../hooks/use-active-training-day', () => ({
  useActiveTrainingDay: (userId: string) => mockUseActiveTrainingDay(userId),
}))

const mockUseBodyMetrics = vi.fn()
vi.mock('../hooks/use-body-metrics', () => ({ useBodyMetrics: (userId: string) => mockUseBodyMetrics(userId) }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function stubDefaults() {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({
    profile: { taegliches_kalorienziel: 2000, geschlecht: null, alter: null, groesse: null, aktuelles_gewicht: null, aktivitaetslevel: null, ziel: null, ziel_delta_kcal: 500, analyse_auswahl: [] },
    loading: false,
    error: false,
    reload: vi.fn(),
    updateProfile: vi.fn(),
  })
  mockUseFoodEntries.mockReturnValue({ entries: [], loading: false, addEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() })
  mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })
  mockUseBodyMetrics.mockReturnValue({ rows: [], loading: false, error: false, saveEntry: vi.fn(), deleteEntry: vi.fn(), reload: vi.fn() })
}

describe('HomePage', () => {
  it('shows todays calories via DailySummary', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Heute')).toBeInTheDocument()
  })

  it('shows the active training day when there is one', () => {
    stubDefaults()
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Push/Pull/Legs', aktiv: true, user_id: 'u1' },
      day: { id: 'd1', name: 'Push', reihenfolge: 1 },
      loading: false,
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Push/Pull/Legs — Push')).toBeInTheDocument()
  })

  it('shows "Kein aktiver Plan" without an active plan', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Kein aktiver Plan.')).toBeInTheDocument()
  })

  it('shows the latest weight change', () => {
    stubDefaults()
    mockUseBodyMetrics.mockReturnValue({
      rows: [
        { id: 'c', datum: '2026-08-24', gewicht: 82.5, bauchumfang: null, beinumfang: null, armumfang: null, ruckenumfang: null, brustumfang: null, koerperfettanteil: null },
        { id: 'a', datum: '2026-08-17', gewicht: 83.3, bauchumfang: null, beinumfang: null, armumfang: null, ruckenumfang: null, brustumfang: null, koerperfettanteil: null },
      ],
      loading: false,
      error: false,
      saveEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn(),
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/−0,8 kg seit dem letzten Eintrag/)).toBeInTheDocument()
  })

  it('shows "Keine Messwerte." without any weight entry', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Keine Messwerte.')).toBeInTheDocument()
  })

  it('renders no Home chart and no analysis query without a pinned selection', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.queryByText('Aktivitätsraster')).not.toBeInTheDocument()
  })
})
