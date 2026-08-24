import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NutritionAnalysisPage from './NutritionAnalysisPage'

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
    loading: false,
    error: false,
  })
  mockUseProfile.mockReturnValue({
    profile: { taegliches_kalorienziel: 1672 },
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
  it('shows the area chart with the goal from the profile', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Kalorien pro Tag' })).toBeInTheDocument()
    expect(screen.getByText('Ziel 1672 kcal')).toBeInTheDocument()
  })

  it('draws without a goal when the profile is incomplete', () => {
    mockUseProfile.mockReturnValue({
      profile: { taegliches_kalorienziel: null },
      loading: false,
      error: false,
      updateProfile: vi.fn(),
    })
    zeige()
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Kalorien pro Tag' })).toBeInTheDocument()
  })

  it('asks for 90 days by default and reloads with the chosen range', () => {
    zeige()
    expect(mockUseNutritionAnalysis).toHaveBeenCalledWith('u1', 90)
    fireEvent.click(screen.getByRole('button', { name: '1 Jahr' }))
    expect(mockUseNutritionAnalysis).toHaveBeenLastCalledWith('u1', 365)
  })

  it('shows one message for a failed load', () => {
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByText('Daten konnten nicht geladen werden.')).toHaveLength(1)
  })

  it('shows a loading state', () => {
    mockUseNutritionAnalysis.mockReturnValue({ entries: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })
})
