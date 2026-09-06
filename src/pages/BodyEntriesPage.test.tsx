import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import BodyEntriesPage from './BodyEntriesPage'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'
import { renderWithProviders } from '../test-render'

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
      { id: 'a', datum: '2026-08-17', ...emptyRow, gewicht: 83.3 },
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
  return renderWithProviders(<BodyEntriesPage />)
}

describe('BodyEntriesPage', () => {
  it('lists every entry with its date', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    expect(screen.getByText('24.08.2026')).toBeInTheDocument()
    expect(screen.getByText('17.08.2026')).toBeInTheDocument()
  })

  it('wraps each entry in the card-in-list markup', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()

    // The li must never carry cardClass directly — index.css's transition rule
    // for bare <li> elements (display:flex/justify-content:center/border-bottom)
    // would clobber the card look. cardClass belongs on the nested div only.
    const li = screen.getByText('24.08.2026').closest('li')
    expect(li).toHaveClass('block', 'border-b-0')
    const card = screen.getByText('24.08.2026').closest('div')
    expect(card).toHaveClass('bg-surface', 'rounded-3xl')
  })

  it('says so instead of showing an empty list when nothing was recorded', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult({ rows: [] }))

    renderPage()

    expect(screen.getByText('Noch keine Einträge.')).toBeInTheDocument()
  })

  it('opens the form prefilled when correcting an entry', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-17')
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
  })

  it('deletes an entry', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult()
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    await waitFor(() => expect(result.deleteEntry).toHaveBeenCalledWith('c'))
  })

  it('reports a failed delete instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult({ deleteEntry: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('shows a stale-mirror notice, not a failure claim, when saving only fails to sync the profile', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult({
      saveEntry: vi.fn().mockRejectedValue(new ProfileWeightSyncError()),
    })
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(/aktuelle Gewicht im Profil konnte nicht aktualisiert werden/)
    expect(notice).not.toHaveTextContent(/nicht gespeichert/)
  })

  it('shows a stale-mirror notice, not a failed-delete claim, when deleting only fails to sync the profile', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = metricsResult({
      deleteEntry: vi.fn().mockRejectedValue(new ProfileWeightSyncError()),
    })
    mockUseBodyMetrics.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Löschen' })[0])

    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(/Eintrag gelöscht/)
    expect(notice).toHaveTextContent(/aktuelle Gewicht im Profil konnte nicht aktualisiert werden/)
    expect(notice).not.toHaveTextContent(/nicht gelöscht werden/)
  })

  it('resets the form on reopen instead of showing the last attempt', () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseBodyMetrics.mockReturnValue(metricsResult())

    renderPage()
    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(screen.queryByLabelText('Gewicht (kg)')).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Bearbeiten' })[1])
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
  })
})
