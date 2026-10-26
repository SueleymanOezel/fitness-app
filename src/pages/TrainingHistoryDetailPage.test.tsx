import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import TrainingHistoryDetailPage from './TrainingHistoryDetailPage'
import { renderWithProviders } from '../test-render'

const mockUseWorkoutSession = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks() // mockNavigate is shared across tests
})

const set = {
  id: 'set1',
  exercise_id: 'ex1',
  satz_nummer: 1,
  gewicht: 62.5,
  wiederholungen: 10,
  rir: 2,
  ist_aufwaermsatz: false,
  abgeschlossen_am: '2026-08-20T10:05:00.000Z',
  exercise: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 },
}

function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: {
      id: 's1',
      workout_plan_day_id: 'd1',
      gestartet_am: '2026-08-20T10:00:00.000Z',
      beendet_am: '2026-08-20T10:58:00.000Z',
      gesamt_kalorien: 400,
      tag_name: 'Tag A',
    },
    exercises: [],
    sets: [set],
    loading: false,
    logSet: vi.fn(),
    updateSet: vi.fn().mockResolvedValue(undefined),
    deleteSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<TrainingHistoryDetailPage />, {
    route: '/training/history/s1',
    path: '/training/history/:sessionId',
  })
}

describe('TrainingHistoryDetailPage', () => {
  it('heads the page with day, date, duration and calories', () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Tag A' })).toBeInTheDocument()
    expect(screen.getByText('Donnerstag, 20. August 2026')).toBeInTheDocument()
    expect(screen.getByText('58 min · 400 kcal')).toBeInTheDocument()
  })

  it('falls back to a generic title for a session without a plan day', () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ session: { ...sessionResult().session, tag_name: null } }),
    )

    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Trainingseinheit' })).toBeInTheDocument()
  })

  it('shows the duration alone when no calorie result was stored', () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ session: { ...sessionResult().session, gesamt_kalorien: null } }),
    )

    renderPage()

    expect(screen.getByText('58 min')).toBeInTheDocument()
  })

  it('marks a session that was never finished instead of showing 0 kcal', () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ session: { ...sessionResult().session, beendet_am: null, gesamt_kalorien: null } }),
    )

    renderPage()

    expect(screen.queryByText(/kcal/)).not.toBeInTheDocument()
    expect(screen.getByText('nicht beendet')).toBeInTheDocument()
  })

  it('groups the sets per exercise as a read-only table', () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          { ...set, id: 'w', satz_nummer: 1, gewicht: 40, ist_aufwaermsatz: true },
          { ...set, id: 'a', satz_nummer: 2 },
          { ...set, id: 'r', exercise_id: 'ex2', exercise: { id: 'ex2', name: 'Cable Row', name_de: null, met_wert: 5 } },
          { ...set, id: 'b', satz_nummer: 3, wiederholungen: 8 },
        ],
      }),
    )

    renderPage()

    const headings = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
    expect(headings).toEqual(['Bankdrücken', 'Cable Row'])
    const bank = screen.getByRole('heading', { name: 'Bankdrücken' }).closest('section')!
    expect(within(bank).getAllByRole('row')).toHaveLength(4) // header + Aufw. + 2 working sets
    expect(within(bank).getByRole('button', { name: 'Aufw. 1 bearbeiten' })).toBeInTheDocument()
    expect(within(bank).getByRole('button', { name: 'Satz 2 bearbeiten' })).toBeInTheDocument()
    expect(within(bank).getAllByText('62,5')).toHaveLength(2)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('explains the abbreviations of the set table once', () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(screen.getByText(/Aufw\. = Aufwärmsatz · RIR = Wiederholungen in Reserve/)).toBeInTheDocument()
  })

  it('names a set of a deleted exercise instead of showing an empty heading', () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [{ ...set, exercise: null }] }))

    renderPage()

    expect(screen.getByRole('heading', { name: 'Unbekannte Übung' })).toBeInTheDocument()
  })

  it('corrects a set through the dialog opened from its row', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Satz 1 bearbeiten' }))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('set1', {
        gewicht: 62.5,
        wiederholungen: 12,
        rir: 2,
        ist_aufwaermsatz: false,
      }),
    )
  })

  it('deletes a single set from the dialog', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Satz 1 bearbeiten' }))
    fireEvent.click(screen.getByRole('button', { name: 'Satz löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => expect(result.deleteSet).toHaveBeenCalledWith('set1'))
  })

  it('deletes the session and navigates back to the history list', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Training löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => expect(result.deleteSession).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/history'))
  })

  it('reports a failed delete instead of navigating away', async () => {
    const result = sessionResult({ deleteSession: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Training löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('reports a session that no longer exists instead of loading forever', async () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult({ session: null, sets: [] }))

    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
