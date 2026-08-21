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

    expect(screen.getByRole('link', { name: /Einträge/ })).toBeInTheDocument()
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

    // The dashboard shows the sections; the entry list lives on /nutrition/entries.
    expect(screen.queryByText('Noch keine Einträge heute.')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Einträge/ })).toHaveAttribute(
      'href',
      '/nutrition/entries',
    )
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

  it('lists the sections with their calories and links to the entries page', async () => {
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

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    const fruehstueck = screen.getByRole('link', { name: /Frühstück/ })
    expect(fruehstueck).toHaveTextContent('150 kcal')
    expect(fruehstueck).toHaveAttribute('href', '/nutrition/entries')
    expect(screen.getByRole('link', { name: /Abendessen/ })).toHaveTextContent('0 kcal')
  })

  it('shows an "Ohne Zuordnung" row for entries with no section, matching the daily total', async () => {
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

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // Every pre-existing entry has mahlzeit = null; without this row the section
    // list would read "0 kcal" everywhere while the daily total (which sums ALL
    // entries) shows 150 — an inconsistency that must not exist right after merge.
    const ohneZuordnung = screen.getByRole('link', { name: /Ohne Zuordnung/ })
    expect(ohneZuordnung).toHaveTextContent('150 kcal')
    expect(ohneZuordnung).toHaveAttribute('href', '/nutrition/entries')
  })

  it('shows an occupied but unnamed slot as "Abschnitt <N>" with its calories', async () => {
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

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // Slot 5 has entries but profile.mahlzeit_5_name is null — it must stay
    // visible as "Abschnitt 5" instead of disappearing with its calories intact.
    const abschnitt5 = screen.getByRole('link', { name: /Abschnitt 5/ })
    expect(abschnitt5).toHaveTextContent('100 kcal')
    expect(abschnitt5).toHaveAttribute('href', '/nutrition/entries')
  })

  it('no longer captures entries on the dashboard', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue(profileResult({ profile }))
    mockUseFoodEntries.mockReturnValue(entriesResult())

    const { default: NutritionPage } = await import('./NutritionPage')
    render(<NutritionPage />, { wrapper: MemoryRouter })

    // Capturing needs a section, and the sections live on the entries page.
    expect(screen.queryByRole('button', { name: 'Barcode scannen' })).not.toBeInTheDocument()
  })
})
