import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
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

const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))

const mockUseNutritionAnalysis = vi.fn()
vi.mock('../hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: (userId: string, zeitraum: unknown) => mockUseNutritionAnalysis(userId, zeitraum),
}))

vi.mock('../hooks/use-training-kcal-heute', () => ({ useTrainingKcalHeute: () => 0 }))

const mockUseHomeAnalysis = vi.fn()
vi.mock('../hooks/use-home-analysis', () => ({
  useHomeAnalysis: (userId: string, zeitraum: unknown) => mockUseHomeAnalysis(userId, zeitraum),
}))

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
  mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 0, dieseWoche: 0, ziel: 3 }, loading: false })
  // No chart pinned by default: use-home-analysis must not be exercised at
  // all in that case (asserted below), this stub only guards against a
  // regression accidentally calling it and crashing on a destructure of
  // undefined instead of failing the "not called" assertion cleanly.
  mockUseHomeAnalysis.mockReturnValue({ sessions: [], entries: [], rows: [], loading: false, error: false })
  mockUseNutritionAnalysis.mockReturnValue({ entries: [], sessions: [], loading: false, error: false })
}

describe('HomePage', () => {
  // Re-audit 24.10.2026: Home was a dead end; weighing in or logging a meal took a tab switch first.
  it('opens the weight entry right from the weight tile', async () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: /^Gewicht/ }))
    expect(await screen.findByRole('spinbutton', { name: /Gewicht/ })).toBeInTheDocument()
  })

  it('adds a meal right from the calorie card', async () => {
    stubDefaults()
    const { profile, ...rest } = mockUseProfile()
    mockUseProfile.mockReturnValue({ ...rest, profile: { ...profile, mahlzeit_1_name: 'Frühstück', mahlzeit_2_name: 'Mittagessen' } })
    renderWithProviders(<HomePage />)
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag hinzufügen' }))
    expect(await screen.findByRole('heading', { name: /^Eintrag für/ })).toBeInTheDocument()
  })

  it('leads from the week tile to training', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('link', { name: /Diese Woche/ })).toHaveAttribute('href', '/training')
  })

  it('shows todays calories in the calorie card', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('region', { name: 'Kalorien' })).toBeInTheDocument()
    expect(screen.getByText('2000 kcal übrig')).toBeInTheDocument()
  })

  it('shows the active training day when there is one', () => {
    stubDefaults()
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Push/Pull/Legs', aktiv: true, user_id: 'u1' },
      day: { id: 'd1', name: 'Push', reihenfolge: 1 },
      loading: false,
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Push')).toBeInTheDocument()
    expect(screen.getByText('Push/Pull/Legs')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zum Training' })).toHaveAttribute('href', '/training')
  })

  it('shows "Kein aktiver Plan" without an active plan', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Kein aktiver Plan.')).toBeInTheDocument()
  })

  it('shows a message for an active plan that has no days yet', () => {
    stubDefaults()
    mockUseActiveTrainingDay.mockReturnValue({
      plan: { id: 'p1', name: 'Push/Pull/Legs', aktiv: true, user_id: 'u1' },
      day: null,
      loading: false,
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Plan „Push/Pull/Legs“ hat noch keine Tage.')).toBeInTheDocument()
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

  it('shows the current weight without a delta for a first-ever weigh-in', () => {
    stubDefaults()
    mockUseBodyMetrics.mockReturnValue({
      rows: [
        { id: 'a', datum: '2026-08-24', gewicht: 82.5, bauchumfang: null, beinumfang: null, armumfang: null, ruckenumfang: null, brustumfang: null, koerperfettanteil: null },
      ],
      loading: false,
      error: false,
      saveEntry: vi.fn(),
      deleteEntry: vi.fn(),
      reload: vi.fn(),
    })
    renderWithProviders(<HomePage />)
    expect(screen.getByText(/82,5 kg/)).toBeInTheDocument()
    expect(screen.queryByText(/seit dem letzten Eintrag/)).not.toBeInTheDocument()
    expect(screen.queryByText('Keine Messwerte.')).not.toBeInTheDocument()
  })

  it('shows the current streak', () => {
    stubDefaults()
    mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 4, dieseWoche: 0, ziel: 3 }, loading: false })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('Diese Woche 0 von 3')).toBeInTheDocument()
  })

  it('shows a message instead of a streak count when there is none yet', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.getByText('0 von 3')).toBeInTheDocument()
  })

  it('does not query Home analysis data without a pinned selection', () => {
    stubDefaults()
    renderWithProviders(<HomePage />)
    expect(screen.queryByRole('heading', { name: 'Aktivitätsraster' })).not.toBeInTheDocument()
    expect(mockUseHomeAnalysis).not.toHaveBeenCalled()
  })

  it('renders the pinned Home chart and queries analysis data once one is pinned', async () => {
    stubDefaults()
    mockUseProfile.mockReturnValue({
      profile: {
        taegliches_kalorienziel: 2000,
        geschlecht: null,
        alter: null,
        groesse: null,
        aktuelles_gewicht: null,
        aktivitaetslevel: null,
        ziel: null,
        ziel_delta_kcal: 500,
        analyse_auswahl: ['H1'],
      },
      loading: false,
      error: false,
      reload: vi.fn(),
      updateProfile: vi.fn(),
    })
    renderWithProviders(<HomePage />)
    // findBy, not getBy: ActivityGridChart is behind React.lazy, so the first
    // render is the Suspense fallback — see the project's "jedes findBy* hinter
    // einer React.lazy-Grenze braucht { timeout: 5000 }" convention.
    expect(
      await screen.findByRole('heading', { name: 'Aktivitätsraster' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(mockUseHomeAnalysis).toHaveBeenCalledWith('u1', 90)
  })

  it('shows a skeleton while anything loads', () => {
    stubDefaults()
    mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 0, dieseWoche: 0, ziel: 3 }, loading: true })
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('sums up the week in one card that links to the analysis', () => {
    stubDefaults()
    mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 2, dieseWoche: 1, ziel: 3 }, loading: false })
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Wochenbilanz')).toBeInTheDocument()
    expect(screen.getByText('1 Training')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Zur Analyse/ })).toHaveAttribute('href', '/home/analyse')
    // The tab bar already links the areas; no second list of them on the page.
    expect(screen.queryByRole('link', { name: 'Ernährung' })).not.toBeInTheDocument()
  })

  it('opens the first start once for an account without a goal', () => {
    stubDefaults()
    const { profile, ...rest } = mockUseProfile()
    mockUseProfile.mockReturnValue({ ...rest, profile: { ...profile, taegliches_kalorienziel: null } })
    renderWithProviders(<HomePage />)
    expect(screen.getByRole('heading', { name: 'Willkommen bei VitaLoop' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Später' }))
    // Put off: the checklist takes over, and a new visit does not pop up again.
    expect(screen.getByRole('button', { name: /Tagesziel festlegen/ })).toBeInTheDocument()
    expect(localStorage.getItem('vl-erststart-gesehen:u1')).toBe('1')
  })

  it('renders cleanly for a brand-new account', () => {
    stubDefaults()
    const { container } = renderWithProviders(<HomePage />)
    expect(container.textContent).not.toMatch(/undefined|NaN/)
    expect(screen.getByRole('link', { name: 'Trainingsplan anlegen' })).toHaveAttribute('href', '/training/plans')
  })

  it('keeps the first steps after a first start until all four were done once', () => {
    stubDefaults()
    localStorage.setItem('vl-erststart-gesehen:u1', '1')
    const { unmount } = renderWithProviders(<HomePage />)
    // Goal set, plan, weight and meal open: the checklist carries the plan, no second "Kein aktiver Plan".
    expect(screen.getByRole('heading', { name: 'Erste Schritte' })).toBeInTheDocument()
    expect(screen.queryByText('Kein aktiver Plan.')).not.toBeInTheDocument()
    unmount()

    mockUseActiveTrainingDay.mockReturnValue({ plan: { id: 'p1', name: 'Plan', aktiv: true, user_id: 'u1' }, day: null, loading: false })
    mockUseBodyMetrics.mockReturnValue({ rows: [{ id: 'b1', datum: '2026-10-01', gewicht: 80 }], loading: false, error: false, saveEntry: vi.fn(), deleteEntry: vi.fn(), reload: vi.fn() })
    mockUseFoodEntries.mockReturnValue({ entries: [{ id: 'f1', menge: 100, products: { kalorien: 100 } }], loading: false, addEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() })
    const zweiter = renderWithProviders(<HomePage />)
    expect(screen.queryByRole('heading', { name: 'Erste Schritte' })).not.toBeInTheDocument()
    zweiter.unmount()

    // Done for good: no meal today and the plan gone again bring back the empty state, not the checklist.
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })
    mockUseFoodEntries.mockReturnValue({ entries: [], loading: false, addEntry: vi.fn(), updateEntry: vi.fn(), deleteEntry: vi.fn() })
    renderWithProviders(<HomePage />)
    expect(screen.queryByRole('heading', { name: 'Erste Schritte' })).not.toBeInTheDocument()
    expect(screen.getByText('Kein aktiver Plan.')).toBeInTheDocument()
  })
})
