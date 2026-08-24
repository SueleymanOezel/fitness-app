import { afterEach, describe, expect, it, vi } from 'vitest'
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

function renderPage() {
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

    renderPage()

    expect(screen.getByText('82,5 kg')).toBeInTheDocument()
    expect(screen.getByText(/24\.08\./)).toBeInTheDocument()
  })

  it('shows the change against the previous entry that carried the value', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    expect(screen.getByText(/−0,8 kg seit 17\.08\./)).toBeInTheDocument()
  })

  it('shows a dash for a measurement that was never taken', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    // Leg circumference is null in both rows.
    expect(screen.getByTestId('wert-beinumfang')).toHaveTextContent('—')
  })

  it('opens the entry form on the button', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))

    expect(screen.getByLabelText('Datum')).toBeInTheDocument()
  })

  it('reports a failed load instead of showing an empty body area', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ error: true, rows: [] }))

    renderPage()

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows a stale-mirror notice, not a failure notice, when only the profile sync fails', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(
      metricsResult({ saveEntry: vi.fn().mockRejectedValue(new ProfileWeightSyncError()) }),
    )

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Heute eintragen' }))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '80' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(/aktuelle Gewicht im Profil konnte nicht aktualisiert werden/)
    expect(notice).not.toHaveTextContent(/nicht gespeichert/)
  })
})
