import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NutritionAnalysisPage from './NutritionAnalysisPage'
import { chartsFor } from '../lib/analysis/registry'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseNutritionAnalysis = vi.fn()
vi.mock('../hooks/use-nutrition-analysis', () => ({
  useNutritionAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseNutritionAnalysis(userId, zeitraum),
}))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: () => mockUseProfile() }))

vi.mock('../components/charts/ChartPicker', async () => {
  const actual = await vi.importActual<typeof import('../components/charts/ChartPicker')>(
    '../components/charts/ChartPicker',
  )
  return {
    ...actual,
    default: () => <span data-testid="picker" />,
    useChartSelection: () => ({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: '',
    }),
  }
})

const vollstaendigesProfil = {
  geschlecht: 'maennlich' as const,
  aktivitaetslevel: 'moderat' as const,
  ziel: 'halten' as const,
  ziel_delta_kcal: 500,
  aktuelles_gewicht: 82.5,
  groesse: 180,
  alter: 30,
  taegliches_kalorienziel: null as number | null,
}

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseNutritionAnalysis.mockReturnValue({
    entries: [eintrag(23, 1800), eintrag(24, 2100)],
    sessions: [],
    loading: false,
    error: false,
  })
  mockUseProfile.mockReturnValue({
    profile: { ...vollstaendigesProfil, taegliches_kalorienziel: 1672 },
    loading: false,
    error: false,
    updateProfile: vi.fn(),
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <NutritionAnalysisPage />
    </MemoryRouter>,
  )

describe('NutritionAnalysisPage', () => {
  it('shows the area chart with the goal from the profile', async () => {
    zeige()
    // findByRole, not getByRole: NutritionChartList loads the chart behind
    // React.lazy, so the first render is the Suspense fallback.
    expect(
      await screen.findByRole('heading', { name: 'Kalorien pro Tag' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Ziel 1672 kcal', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('falls back to the calculated goal when none was typed', async () => {
    // The manual field is null for everyone who never typed a goal — the
    // normal state. The rest of the app reads effectiveCalorieGoal, which
    // falls back to Mifflin-St-Jeor; reading the raw column here would drop
    // the reference line for exactly those users.
    mockUseProfile.mockReturnValue({
      profile: { ...vollstaendigesProfil, taegliches_kalorienziel: null },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    // 10*82.5 + 6.25*180 - 5*30 + 5 = 1805 kcal BMR, x 1.55 (moderat) = 2798 —
    // above both logged days, which is the normal case for someone cutting.
    expect(await screen.findByText('Ziel 2798 kcal', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('draws without a goal when the profile is incomplete', async () => {
    mockUseProfile.mockReturnValue({
      profile: {
        ...vollstaendigesProfil,
        taegliches_kalorienziel: null,
        geschlecht: null,
        groesse: null,
        alter: null,
      },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    // Erst den Graphen abwarten, sonst waere "kein Ziel-Text" auch dann wahr,
    // wenn der Graph gleich noch hinter der Suspense-Huelle steckt.
    expect(
      await screen.findByRole('heading', { name: 'Kalorien pro Tag' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
  })

  it('asks for 90 days by default and reloads with the chosen range', () => {
    zeige()
    expect(mockUseNutritionAnalysis).toHaveBeenCalledWith('u1', 90)
    fireEvent.click(screen.getByRole('button', { name: '1 Jahr' }))
    expect(mockUseNutritionAnalysis).toHaveBeenLastCalledWith('u1', 365)
  })

  it('shows one message for a failed load', () => {
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], sessions: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByText('Daten konnten nicht geladen werden.')).toHaveLength(1)
  })

  it('shows a loading state', () => {
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], sessions: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders every registered nutrition chart', async () => {
    // Der Fall, den die Registry verhindern soll: ein Graph ist angemeldet, aber
    // die Seite kennt ihn nicht — er waere im Picker sichtbar und nirgends sonst.
    mockUseProfile.mockReturnValue({
      profile: {
        ...vollstaendigesProfil,
        taegliches_kalorienziel: 1672,
        mahlzeit_1_name: 'Frühstück',
        mahlzeit_2_name: 'Mittagessen',
        mahlzeit_3_name: 'Abendessen',
        mahlzeit_4_name: 'Snacks',
        mahlzeit_5_name: null,
        mahlzeit_6_name: null,
      },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    for (const chart of chartsFor('nutrition')) {
      expect(await screen.findByText(chart.titel, {}, { timeout: 5000 })).toBeInTheDocument()
    }
  })
})
