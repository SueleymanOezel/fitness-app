import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BodyPage from './BodyPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseBodyMetrics = vi.fn()
vi.mock('../hooks/use-body-metrics', async () => {
  const actual = await vi.importActual<typeof import('../hooks/use-body-metrics')>(
    '../hooks/use-body-metrics',
  )
  return {
    ...actual,
    useBodyMetrics: (userId: string) => mockUseBodyMetrics(userId),
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  // In afterEach, not in the test body: a failing test must not leak fake
  // timers into the ones that follow.
  vi.useRealTimers()
})

const emptyRow = {
  gewicht: null,
  bauchumfang: null,
  beinumfang: null,
  armumfang: null,
  ruckenumfang: null,
  brustumfang: null,
  koerperfettanteil: null,
}

function metricsResult(overrides: Record<string, unknown> = {}) {
  return {
    rows: [
      { id: 'c', datum: '2026-08-24', ...emptyRow, gewicht: 82.5 },
      { id: 'a', datum: '2026-08-17', ...emptyRow, gewicht: 83.3, bauchumfang: 90 },
    ],
    loading: false,
    error: false,
    saveEntry: vi.fn().mockResolvedValue(undefined),
    deleteEntry: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn(),
    ...overrides,
  }
}

function zeigeDashboard() {
  return render(
    <MemoryRouter>
      <BodyPage />
    </MemoryRouter>,
  )
}

describe('BodyPage', () => {
  it('shows the newest value with its date', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    expect(screen.getByText('82,5 kg')).toBeInTheDocument()
    expect(screen.getByText(/24\.08\./)).toBeInTheDocument()
  })

  it('shows the change against the previous entry that carried the value', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    expect(screen.getByText(/−0,8 kg seit 17\.08\./)).toBeInTheDocument()
  })

  it('shows a dash for a measurement that was never taken', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()

    // Leg circumference is null in both rows.
    expect(screen.getByTestId('wert-beinumfang')).toHaveTextContent('—')
  })

  it('opens the entry form on the button', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    zeigeDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))

    expect(screen.getByLabelText('Datum')).toBeInTheDocument()
  })

  it('prefills the form from the entry that already exists for today', () => {
    // saveEntry upserts all seven columns, so an empty form would overwrite
    // everything recorded earlier today with null. Entering weight in the
    // morning and again in the evening must not wipe the circumferences.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 19, 0, 0))
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(
      metricsResult({
        rows: [
          { id: 'c', datum: '2026-08-24', ...emptyRow, gewicht: 82.5, bauchumfang: 88 },
          { id: 'a', datum: '2026-08-17', ...emptyRow, gewicht: 83.3 },
        ],
      }),
    )

    zeigeDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-24')
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.5)
    expect(screen.getByLabelText('Bauchumfang (cm)')).toHaveValue(88)
  })

  it('reports a failed load instead of showing an empty body area', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ error: true, rows: [] }))

    zeigeDashboard()

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows a stale-mirror notice, not a failure notice, when only the profile sync fails', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(
      metricsResult({ saveEntry: vi.fn().mockRejectedValue(new ProfileWeightSyncError()) }),
    )

    zeigeDashboard()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(/aktuelle Gewicht im Profil konnte nicht aktualisiert werden/)
    expect(notice).not.toHaveTextContent(/nicht gespeichert/)
  })
})

const mockUseBodyAnalysis = vi.fn()
vi.mock('../hooks/use-body-analysis', () => ({
  useBodyAnalysis: (userId: string, zeitraum: unknown) => mockUseBodyAnalysis(userId, zeitraum),
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

describe('BodyPage – ausgewaehlte Graphen', () => {
  const leerZeile = {
    bauchumfang: null,
    beinumfang: null,
    armumfang: null,
    ruckenumfang: null,
    brustumfang: null,
    koerperfettanteil: null,
  }

  beforeEach(() => {
    mockUseBodyAnalysis.mockReturnValue({
      rows: [
        { id: 'a', datum: '2026-08-17', gewicht: 83.3, ...leerZeile },
        { id: 'b', datum: '2026-08-24', gewicht: 82.5, ...leerZeile },
      ],
      loading: false,
      error: false,
    })
    mockUseChartSelection.mockReturnValue({
      auswahl: ['K1'],
      istGewaehlt: (id: string) => id === 'K1',
      umschalten: vi.fn(),
      fehler: '',
    })
  })

  it('shows a pinned chart with the fixed 90-day range', () => {
    // No range switch on a dashboard: a dashboard with controls is not a
    // dashboard any more.
    zeigeDashboard()
    expect(screen.getByRole('heading', { name: 'Gewichtsverlauf' })).toBeInTheDocument()
    expect(mockUseBodyAnalysis).toHaveBeenCalledWith('u1', 90)
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
    expect(screen.queryByRole('heading', { name: 'Gewichtsverlauf' })).not.toBeInTheDocument()
    expect(mockUseBodyAnalysis).not.toHaveBeenCalled()
  })

  it('links to the analysis page', () => {
    zeigeDashboard()
    expect(screen.getByRole('link', { name: 'Analyse' })).toHaveAttribute('href', '/body/analyse')
  })
})
