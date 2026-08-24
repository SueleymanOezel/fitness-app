import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrainingPage from './TrainingPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseActiveTrainingDay = vi.fn()
vi.mock('../hooks/use-active-training-day', () => ({
  useActiveTrainingDay: (userId: string) => mockUseActiveTrainingDay(userId),
}))

const mockStartWorkoutSession = vi.fn()
const mockNavigate = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  startWorkoutSession: (userId: string, dayId: string) => mockStartWorkoutSession(userId, dayId),
}))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks() // mockNavigate is shared; a call from an earlier test would leak into the next
})

const activeDay = {
  plan: { id: 'p1', name: 'Ganzkörper', aktiv: true },
  day: { id: 'd1', name: 'Tag A', reihenfolge: 1 },
  loading: false,
}

function zeigeDashboard() {
  return render(<TrainingPage />, { wrapper: MemoryRouter })
}

describe('TrainingPage', () => {
  it('shows a placeholder while there is no session', () => {
    mockUseSession.mockReturnValue({ session: null, loading: false })

    zeigeDashboard()

    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
  })

  it('shows the active plan, the next day, and a link to manage plans', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)

    zeigeDashboard()

    expect(screen.getByText('Ganzkörper')).toBeInTheDocument()
    expect(screen.getByText('Tag A')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Meine Pläne' })).toHaveAttribute('href', '/training/plans')
  })

  it('starts a session for the next day and navigates to it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockStartWorkoutSession.mockResolvedValue('s1')

    zeigeDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Training starten' }))

    await waitFor(() => expect(mockStartWorkoutSession).toHaveBeenCalledWith('u1', 'd1'))
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/session/s1'))
  })

  it('shows a message and no start button when no plan is active', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: null, day: null, loading: false })

    zeigeDashboard()

    expect(screen.queryByRole('button', { name: 'Training starten' })).not.toBeInTheDocument()
    expect(screen.getByText(/kein aktiver Plan/i)).toBeInTheDocument()
  })

  it('asks for a day when the active plan has none yet', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue({ plan: activeDay.plan, day: null, loading: false })

    zeigeDashboard()

    expect(screen.queryByRole('button', { name: 'Training starten' })).not.toBeInTheDocument()
    expect(screen.getByText(/noch keinen Tag/i)).toBeInTheDocument()
  })

  it('reports a failed start instead of navigating', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockStartWorkoutSession.mockRejectedValue(new Error('boom'))

    zeigeDashboard()

    fireEvent.click(screen.getByRole('button', { name: 'Training starten' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})

const mockUseTrainingAnalysis = vi.fn()
vi.mock('../hooks/use-training-analysis', () => ({
  useTrainingAnalysis: (userId: string, zeitraum: unknown) =>
    mockUseTrainingAnalysis(userId, zeitraum),
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

describe('TrainingPage – ausgewaehlte Graphen', () => {
  const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

  beforeEach(() => {
    // Self-sufficient: this block seeds every mock TrainingPage's own render
    // path depends on, instead of relying on what the describe above left
    // behind — running this block alone (vitest -t) must work.
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseActiveTrainingDay.mockReturnValue(activeDay)
    mockUseTrainingAnalysis.mockReturnValue({
      sessions: [
        { id: 'a', gestartet_am: am(8, 17), beendet_am: null, gesamt_kalorien: null },
        { id: 'b', gestartet_am: am(8, 24), beendet_am: null, gesamt_kalorien: null },
      ],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['T1'],
      istGewaehlt: (id: string) => id === 'T1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', () => {
    zeigeDashboard()
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(mockUseTrainingAnalysis).toHaveBeenCalledWith('u1', 90)
    expect(screen.queryByRole('button', { name: '30 Tage' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('heading', { name: 'Trainingsfrequenz' })).not.toBeInTheDocument()
    expect(mockUseTrainingAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute(
      'href',
      '/training/analyse',
    )
  })
})
