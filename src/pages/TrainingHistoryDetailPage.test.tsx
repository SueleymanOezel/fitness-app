import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TrainingHistoryDetailPage from './TrainingHistoryDetailPage'

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
  gewicht: 60,
  wiederholungen: 10,
  abgeschlossen_am: '2026-08-20T10:05:00.000Z',
  exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
}

function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: {
      id: 's1',
      workout_plan_day_id: 'd1',
      gestartet_am: '2026-08-20T10:00:00.000Z',
      beendet_am: '2026-08-20T11:00:00.000Z',
      gesamt_kalorien: 400,
    },
    exercises: [],
    sets: [set],
    loading: false,
    logSet: vi.fn(),
    updateSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/history/s1']}>
      <Routes>
        <Route path="/training/history/:sessionId" element={<TrainingHistoryDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TrainingHistoryDetailPage', () => {
  it('shows the sets with exercise, weight and reps', async () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByDisplayValue('60')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByText('400 kcal')).toBeInTheDocument()
  })

  it('corrects a set once the field is left, not on every keystroke', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    const field = screen.getByDisplayValue('60')
    fireEvent.change(field, { target: { value: '6' } })
    fireEvent.change(field, { target: { value: '65' } })
    expect(result.updateSet).not.toHaveBeenCalled()

    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledTimes(1))
    expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: 65 })
  })

  it('does not write when a corrected field is left unchanged', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.blur(screen.getByDisplayValue('60'))

    expect(result.updateSet).not.toHaveBeenCalled()
  })

  it('deletes the session and navigates back to the history list', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Session löschen' }))

    await waitFor(() => expect(result.deleteSession).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/history'))
  })

  it('reports a failed delete instead of navigating away', async () => {
    const result = sessionResult({ deleteSession: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Session löschen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('marks a session that was never finished instead of showing 0 kcal', async () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        session: {
          id: 's1',
          workout_plan_day_id: 'd1',
          gestartet_am: '2026-08-20T10:00:00.000Z',
          beendet_am: null,
          gesamt_kalorien: null,
        },
      }),
    )

    renderPage()
    await screen.findByText('Bankdrücken')

    expect(screen.queryByText('0 kcal')).not.toBeInTheDocument()
    expect(screen.getByText('nicht beendet')).toBeInTheDocument()
  })

  it('reports a session that no longer exists instead of loading forever', async () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult({ session: null, sets: [] }))

    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
