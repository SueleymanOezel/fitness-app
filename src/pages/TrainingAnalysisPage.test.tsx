import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrainingAnalysisPage from './TrainingAnalysisPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseTrainingAnalysis = vi.fn()
vi.mock('../hooks/use-training-analysis', () => ({
  useTrainingAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseTrainingAnalysis(userId, zeitraum),
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

const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseTrainingAnalysis.mockReturnValue({
    sessions: [
      { id: 'a', gestartet_am: am(8, 17), beendet_am: null, gesamt_kalorien: null },
      { id: 'b', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null },
    ],
    loading: false,
    error: false,
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <TrainingAnalysisPage />
    </MemoryRouter>,
  )

describe('TrainingAnalysisPage', () => {
  it('shows the area charts with their picker', () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Analyse' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(screen.getByTestId('picker')).toBeInTheDocument()
  })

  it('asks for 90 days by default', () => {
    zeige()
    expect(mockUseTrainingAnalysis).toHaveBeenCalledWith('u1', 90)
  })

  it('reloads with the chosen range', () => {
    zeige()
    fireEvent.click(screen.getByRole('button', { name: '30 Tage' }))
    expect(mockUseTrainingAnalysis).toHaveBeenLastCalledWith('u1', 30)
  })

  it('shows one message for a failed load, not one per chart', () => {
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })

  it('shows a loading state', () => {
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })
})
