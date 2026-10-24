import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrainingAnalysisPage from './TrainingAnalysisPage'
import { chartsFor } from '../lib/analysis/registry'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

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
  return {
    ...actual,
    default: () => <span data-testid="picker" />,
    useChartSelection: () => mockUseChartSelection(),
  }
})

const am = (monat: number, tag: number) => new Date(2026, monat - 1, tag, 18, 0).toISOString()

beforeEach(() => {
  vi.clearAllMocks()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseTrainingAnalysis.mockReturnValue({
    sessions: [
      { id: 'a', gestartet_am: am(8, 17), beendet_am: am(8, 17), gesamt_kalorien: null },
      { id: 'b', gestartet_am: am(8, 24), beendet_am: am(8, 24), gesamt_kalorien: null },
    ],
    sets: [],
    loading: false,
    error: false,
  })
  mockUseChartSelection.mockReturnValue({
    auswahl: [],
    istGewaehlt: () => false,
    umschalten: vi.fn(),
    fehler: '',
  })
})

const zeige = () =>
  render(
    <MemoryRouter>
      <TrainingAnalysisPage />
    </MemoryRouter>,
  )

describe('TrainingAnalysisPage', () => {
  // Re-audit 24.10.2026: the exercise picker sat above the frequency chart it does not drive.
  it('puts the exercise picker right above the strength chart it drives', async () => {
    const satz = (id: string, sessionId: string, exerciseId: string, name: string) => ({
      id, workout_session_id: sessionId, exercise_id: exerciseId, exercise_name: name, muskelgruppen: ['chest'],
      satz_nummer: 1, gewicht: 60, wiederholungen: 8, ist_aufwaermsatz: false,
    })
    mockUseTrainingAnalysis.mockReturnValue({
      ...mockUseTrainingAnalysis(),
      sets: [satz('x1', 'a', 'e1', 'Bankdrücken'), satz('x2', 'b', 'e1', 'Bankdrücken'), satz('x3', 'b', 'e2', 'Kniebeuge')],
    })
    zeige()
    const frequenz = await screen.findByRole('heading', { name: /Trainingsfrequenz/ }, { timeout: 5000 })
    const kraft = await screen.findByRole('heading', { name: /Kraftverlauf/ }, { timeout: 5000 })
    const auswahl = screen.getByLabelText('Übung')
    expect(frequenz.compareDocumentPosition(auswahl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(auswahl.compareDocumentPosition(kraft) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('folds the secondary charts and swaps charts for a short list while customizing', () => {
    mockUseChartSelection.mockReturnValue({
      auswahl: ['T1'],
      istGewaehlt: (id: string) => id === 'T1',
      umschalten: vi.fn(),
      fehler: '',
      anpassen: true,
      setAnpassen: vi.fn(),
    })
    zeige()
    const liste = screen.getByRole('list', { name: 'Graphen auf dem Dashboard' })
    expect(liste.querySelectorAll('input[type=checkbox]')).toHaveLength(chartsFor('training').length)
    expect(screen.queryByText(/Mehr Graphen/)).not.toBeInTheDocument()
  })

  it('offers the remaining charts behind "Mehr Graphen"', () => {
    zeige()
    expect(screen.getByText(`Mehr Graphen (${chartsFor('training').length - 3})`)).toBeInTheDocument()
  })

  it('shows the area charts with their picker', async () => {
    zeige()
    expect(screen.getByRole('heading', { name: 'Trainingsanalyse' })).toBeInTheDocument()
    // findByRole, not getByRole: TrainingChartList loads TrainingFrequencyChart
    // behind React.lazy, so the first render is the Suspense fallback.
    expect(
      await screen.findByRole('heading', { name: 'Trainingsfrequenz' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    await waitFor(
      () => expect(screen.getAllByTestId('picker')).toHaveLength(chartsFor('training').length),
      { timeout: 5000 },
    )
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
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], sets: [], loading: false, error: true })
    zeige()
    expect(screen.getAllByText('Daten konnten nicht geladen werden.')).toHaveLength(1)
  })

  it('shows both messages when the load and the picker save fail independently', () => {
    // A failed load and a selection that could not be saved are different
    // problems with different remedies; they must not collapse into one message.
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], sets: [], loading: false, error: true })
    mockUseChartSelection.mockReturnValue({
      auswahl: [],
      istGewaehlt: () => false,
      umschalten: vi.fn(),
      fehler: 'Auswahl konnte nicht gespeichert werden.',
    })
    zeige()
    expect(screen.getByText('Daten konnten nicht geladen werden.')).toBeInTheDocument()
    expect(screen.getByText('Auswahl konnte nicht gespeichert werden.')).toBeInTheDocument()
  })

  it('shows a loading state', () => {
    mockUseTrainingAnalysis.mockReturnValue({ sessions: [], sets: [], loading: true, error: false })
    zeige()
    expect(screen.getByText('Lädt…')).toBeInTheDocument()
  })

  it('renders every registered training chart', async () => {
    // Der Fall, den die Registry verhindern soll: ein Graph ist angemeldet, aber
    // die Seite kennt ihn nicht — er waere im Picker sichtbar und nirgends sonst.
    zeige()
    for (const chart of chartsFor('training')) {
      expect(await screen.findByText(chart.titel, {}, { timeout: 5000 })).toBeInTheDocument()
    }
  })
})
