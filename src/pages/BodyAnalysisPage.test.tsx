import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyAnalysisPage from './BodyAnalysisPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyAnalysis = vi.fn()
vi.mock('../hooks/use-body-analysis', () => ({
  useBodyAnalysis: (userId: string, zeitraum: unknown) => mockUseBodyAnalysis(userId, zeitraum),
}))

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

const leer = {
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseBodyAnalysis.mockReturnValue({
    rows: [
      { id: 'a', datum: '2026-08-17', gewicht: 83.3, ...leer },
      { id: 'b', datum: '2026-08-24', gewicht: 82.5, ...leer },
    ],
    kalorien: [],
    loading: false,
    error: false,
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <BodyAnalysisPage />
    </MemoryRouter>,
  )

describe('BodyAnalysisPage', () => {
  it('shows the area chart with its picker', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Gewichtsverlauf' })).toBeInTheDocument()
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })

  it('asks for 90 days by default and reloads with the chosen range', () => {
    zeige()
    expect(mockUseBodyAnalysis).toHaveBeenCalledWith('u1', 90)
    fireEvent.click(screen.getByRole('button', { name: 'alles' }))
    expect(mockUseBodyAnalysis).toHaveBeenLastCalledWith('u1', 'alles')
  })

  it('shows one message for a failed load', () => {
    mockUseBodyAnalysis.mockReturnValue({ rows: [], kalorien: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByText('Daten konnten nicht geladen werden.')).toHaveLength(1)
  })

  it('shows a loading state', () => {
    mockUseBodyAnalysis.mockReturnValue({ rows: [], kalorien: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })
})
