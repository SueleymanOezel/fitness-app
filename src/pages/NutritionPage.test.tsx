import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NutritionPage from './NutritionPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseFoodEntries = vi.fn()
vi.mock('../hooks/use-food-entries', () => ({
  useFoodEntries: (userId: string) => mockUseFoodEntries(userId),
}))

// clearAllMocks (not reset): call counts must not leak between tests, but a
// mockReturnValue set by one test may deliberately carry into the next (see
// the "ausgewaehlte Graphen" describe below, which relies on the session and
// profile mocks set by the last test above it).
afterEach(() => {
  vi.clearAllMocks()
})

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
function profileResult(overrides: Record<string, unknown>) {
  return { profile: null, loading: false, error: false, reload: vi.fn(), updateProfile: vi.fn(), ...overrides }
}

function entriesResult(overrides: Record<string, unknown> = {}) {
  return {
    entries: [],
    loading: false,
    addEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    ...overrides,
  }
}

function zeigeDashboard() {
  return render(<NutritionPage />, { wrapper: MemoryRouter })
}

describe('NutritionPage', () => {
  it('shows a loading state while profile or entries are loading', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ loading: true }))
    mockUseFoodEntries.mockReturnValue(entriesResult({ loading: true }))

    zeigeDashboard()

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders the dashboard sections once profile and entries are loaded', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    expect(screen.getByRole('heading', { name: 'Ernährung' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heute' })).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Einträge/ })).toBeInTheDocument()
  })

  it('offers a retry instead of loading forever when the profile cannot be loaded', () => {
    const reload = vi.fn()
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ error: true, reload }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    expect(screen.getByRole('alert')).toHaveTextContent('Profil konnte nicht geladen werden')
    screen.getByRole('button', { name: 'Erneut versuchen' }).click()
    expect(reload).toHaveBeenCalled()
  })

  it('leaves the entry list to its own page', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    // The dashboard shows the sections; the entry list lives on /nutrition/entries.
    expect(screen.queryByText('Noch keine Einträge heute.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Einträge/ })).toHaveAttribute(
      'href',
      '/nutrition/entries',
    )
  })

  it('leaves goal editing to the profile page', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    // The dashboard shows the goal, it does not edit it — editing lives on /profile.
    expect(screen.queryByRole('button', { name: 'Manuell festlegen' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tagesziel (kcal)')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Profil/ })).toBeInTheDocument()
  })

  it('passes the manual calorie goal through to the daily summary', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    // 2000 is the manual override, not the Mifflin-St-Jeor value (2759) for this profile.
    expect(screen.getByText(/Ziel 2000 kcal/)).toBeInTheDocument()
  })

  it('lists the sections with their calories and links to the entries page', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(
      entriesResult({
        entries: [
          {
            id: 'e1',
            menge: 150,
            zeitpunkt: '2026-08-20T06:30:00.000Z',
            product_id: 'p1',
            mahlzeit: 1,
            products: {
              id: 'p1',
              name: 'Testprodukt',
              barcode: null,
              created_by: 'u1',
              kalorien: 100,
              eiweiss: null,
              fett: null,
              kohlenhydrate: null,
            },
          },
        ],
      }),
    )

    zeigeDashboard()

    const fruehstueck = screen.getByRole('link', { name: /Frühstück/ })
    expect(fruehstueck).toHaveTextContent('150 kcal')
    expect(fruehstueck).toHaveAttribute('href', '/nutrition/entries')
    expect(screen.getByRole('link', { name: /Abendessen/ })).toHaveTextContent('0 kcal')
  })

  it('shows an "Ohne Zuordnung" row for entries with no section, matching the daily total', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(
      entriesResult({
        entries: [
          {
            id: 'e1',
            menge: 150,
            zeitpunkt: '2026-08-20T06:30:00.000Z',
            product_id: 'p1',
            mahlzeit: null,
            products: {
              id: 'p1',
              name: 'Testprodukt',
              barcode: null,
              created_by: 'u1',
              kalorien: 100,
              eiweiss: null,
              fett: null,
              kohlenhydrate: null,
            },
          },
        ],
      }),
    )

    zeigeDashboard()

    // Every pre-existing entry has mahlzeit = null; without this row the section
    // list would read "0 kcal" everywhere while the daily total (which sums ALL
    // entries) shows 150 — an inconsistency that must not exist right after merge.
    const ohneZuordnung = screen.getByRole('link', { name: /Ohne Zuordnung/ })
    expect(ohneZuordnung).toHaveTextContent('150 kcal')
    expect(ohneZuordnung).toHaveAttribute('href', '/nutrition/entries')
  })

  it('shows an occupied but unnamed slot as "Abschnitt <N>" with its calories', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(
      entriesResult({
        entries: [
          {
            id: 'e1',
            menge: 50,
            zeitpunkt: '2026-08-20T06:30:00.000Z',
            product_id: 'p1',
            mahlzeit: 5,
            products: {
              id: 'p1',
              name: 'Testprodukt',
              barcode: null,
              created_by: 'u1',
              kalorien: 200,
              eiweiss: null,
              fett: null,
              kohlenhydrate: null,
            },
          },
        ],
      }),
    )

    zeigeDashboard()

    // Slot 5 has entries but profile.mahlzeit_5_name is null — it must stay
    // visible as "Abschnitt 5" instead of disappearing with its calories intact.
    const abschnitt5 = screen.getByRole('link', { name: /Abschnitt 5/ })
    expect(abschnitt5).toHaveTextContent('100 kcal')
    expect(abschnitt5).toHaveAttribute('href', '/nutrition/entries')
  })

  it('no longer captures entries on the dashboard', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    zeigeDashboard()

    // Capturing needs a section, and the sections live on the entries page.
    expect(screen.queryByRole('button', { name: 'Barcode scannen' })).not.toBeInTheDocument()
  })
})

const mockUseNutritionAnalysis = vi.fn()
vi.mock('../hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: (userId: string, zeitraum: unknown) => mockUseNutritionAnalysis(userId, zeitraum),
}))

const mockUseChartSelection = vi.fn()
vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return { ...actual, useChartSelection: () => mockUseChartSelection() }
})

// Default for tests outside the "ausgewaehlte Graphen" describe below, which
// know nothing about chart selection: no chart pinned, so the dashboard
// renders exactly as it did before this hook existed.
beforeEach(() => {
  mockUseChartSelection.mockReturnValue({
    auswahl: [],
    istGewaehlt: () => false,
    umschalten: vi.fn(),
    fehler: '',
  })
})

describe('NutritionPage – ausgewaehlte Graphen', () => {
  const eintrag = (tag: number, kalorien: number) => ({
    zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
    menge: 100,
    mahlzeit: 1,
    products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
  })

  beforeEach(() => {
    // Self-sufficient: this block seeds every mock NutritionPage's own
    // render path depends on, instead of relying on what the describe above
    // left behind — running this block alone (vitest -t) must work.
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())
    mockUseNutritionAnalysis.mockReturnValue({
      entries: [eintrag(23, 1800), eintrag(24, 2100)],
      sessions: [],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['E1'],
      istGewaehlt: (id: string) => id === 'E1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', async () => {
    zeigeDashboard()
    // findByRole, not getByRole: CaloriesPerDayChart is now lazy-loaded at
    // this dashboard use site too (not just on the analysis page), so the
    // first render is the Suspense fallback.
    // timeout: the component arrives via a dynamic import. The 1000 ms default
    // is a statement about machine speed, not about correctness, and a loaded
    // CI runner exceeds it often enough to make the suite intermittently red.
    expect(
      await screen.findByRole('heading', { name: 'Kalorien pro Tag' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(mockUseNutritionAnalysis).toHaveBeenCalledWith('u1', 90)
    expect(screen.queryByRole('button', { name: '30 Tage' })).not.toBeInTheDocument()
  })

  it('draws the goal line from the calculated goal when none was typed', async () => {
    // taegliches_kalorienziel is null for everyone who never typed a goal —
    // the normal state. The dashboard already computes effectiveCalorieGoal
    // for DailySummary; the chart must get that same number, not the raw
    // column, or its reference line silently disappears.
    mockUseProfile.mockReturnValue(
      profileResult({ profile: { ...profile, taegliches_kalorienziel: null } }),
    )
    zeigeDashboard()
    // timeout: the component arrives via a dynamic import. The 1000 ms default
    // is a statement about machine speed, not about correctness, and a loaded
    // CI runner exceeds it often enough to make the suite intermittently red.
    const ueberschrift = await screen.findByRole(
      'heading',
      { name: 'Kalorien pro Tag' },
      { timeout: 5000 },
    )
    // Scoped to the chart's own section: DailySummary above it names the same
    // goal, so an unscoped query would pass even with no reference line drawn.
    const abschnitt = ueberschrift.closest('section')!
    // 10*80 + 6.25*180 - 5*30 + 5 = 1780 kcal BMR, x 1.55 (moderat) = 2759 —
    // above both logged days, which is the normal case for someone cutting.
    // findByText: ResponsiveContainer needs one more tick before Recharts
    // draws into the measured box.
    expect(
      await within(abschnitt).findByText('Ziel 2759 kcal', undefined, { timeout: 5000 }),
    ).toBeInTheDocument()
  })

  it('offers no picker on the dashboard', () => {
    zeigeDashboard()
    expect(
      screen.queryByRole('checkbox', { name: 'Auf dem Dashboard zeigen' }),
    ).not.toBeInTheDocument()
  })

  it('shows nothing and asks for nothing when no chart is pinned', () => {
    mockUseChartSelection.mockReturnValue({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    })
    zeigeDashboard()
    expect(screen.queryByRole('heading', { name: 'Kalorien pro Tag' })).not.toBeInTheDocument()
    expect(mockUseNutritionAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute(
      'href',
      '/nutrition/analyse',
    )
  })
})
