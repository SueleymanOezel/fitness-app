import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import TrainingHistoryDetailPage from './TrainingHistoryDetailPage'
import { renderWithProviders } from '../test-render'
import { WIEDERHOLUNGEN_FEHLER } from '../lib/set-values'

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
  rir: 2,
  ist_aufwaermsatz: false,
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
  return renderWithProviders(<TrainingHistoryDetailPage />, {
    route: '/training/history/s1',
    path: '/training/history/:sessionId',
  })
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

  it('shows the German exercise name, falling back to the English one', async () => {
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          { ...set, id: 'a', exercise: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 } },
          { ...set, id: 'b', exercise: { id: 'ex2', name: 'Cable Row', name_de: null, met_wert: 5 } },
        ],
      }),
    )

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(screen.getByText('Cable Row')).toBeInTheDocument()
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

  it('rejects fractional reps, which the integer column would round away', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '10.5' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
  })

  it('does not let the repetitions be emptied, restores the value and says why', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('10')
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
  })

  it('does not let the repetitions be set to zero', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '0' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('10')
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
  })

  it('still corrects the repetitions to another valid number', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '12' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { wiederholungen: 12 }))
    expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument()
  })

  it('shows no message for an old set without repetitions that is merely visited', () => {
    const result = sessionResult({ sets: [{ ...set, wiederholungen: null }] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.blur(screen.getByLabelText('Wiederholungen'))

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument()
  })

  it('accepts a weight typed with a German decimal comma', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Gewicht (kg)')
    fireEvent.change(field, { target: { value: '62,5' } })
    fireEvent.blur(field)

    expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: 62.5 })
  })

  it('rejects exponent notation in the repetitions, like the session dialog', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '1e1' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('10')
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
  })

  it('clears the message and the invalid mark once the repetitions are typed again', () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    const field = screen.getByLabelText('Wiederholungen')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'true')

    fireEvent.change(field, { target: { value: '5' } })

    expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument()
    expect(field).toHaveAttribute('aria-invalid', 'false')
  })

  it('names a set of a deleted exercise instead of showing an empty heading', () => {
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [{ ...set, exercise: null }] }))

    renderPage()

    expect(screen.getByText('Unbekannte Übung')).toBeInTheDocument()
  })

  it('still lets the weight be emptied (bodyweight)', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Gewicht (kg)')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: null }))
  })

  it('still accepts a fractional weight, which is a numeric column', () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = screen.getByLabelText('Gewicht (kg)')
    fireEvent.change(field, { target: { value: '62.5' } })
    fireEvent.blur(field)

    expect(result.updateSet).toHaveBeenCalledWith('set1', { gewicht: 62.5 })
  })

  it('rejects a fractional RIR instead of letting Postgres round it', async () => {
    // rir is a smallint: 2.6 would be stored as 3, a value the user never typed
    // and one the 0-5 check constraint would never complain about.
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = await screen.findByLabelText('RIR')
    fireEvent.change(field, { target: { value: '2.6' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
    expect(field).toHaveValue('2')
  })

  it('rejects an RIR above the scale', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = await screen.findByLabelText('RIR')
    fireEvent.change(field, { target: { value: '9' } })
    fireEvent.blur(field)

    expect(result.updateSet).not.toHaveBeenCalled()
  })

  it('stores a whole-number RIR', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    const field = await screen.findByLabelText('RIR')
    fireEvent.change(field, { target: { value: '4' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateSet).toHaveBeenCalledWith('set1', { rir: 4 }))
  })

  it('toggles the warm-up flag straight through without waiting for a blur', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(await screen.findByLabelText('Aufwärmsatz'))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('set1', { ist_aufwaermsatz: true }),
    )
  })

  it('deletes the session and navigates back to the history list', async () => {
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Session löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => expect(result.deleteSession).toHaveBeenCalled())
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/training/history'))
  })

  it('reports a failed delete instead of navigating away', async () => {
    const result = sessionResult({ deleteSession: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Session löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

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
