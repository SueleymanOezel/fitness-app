import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import WorkoutSessionPage from './WorkoutSessionPage'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseWorkoutSession = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const exercise = {
  exercise_id: 'ex1',
  name: 'Bankdrücken',
  ziel_saetze: 2,
  ziel_wiederholungen: 10,
  pausenzeit_sekunden: 90,
  reihenfolge: 1,
}

function sessionResult(overrides: Partial<ReturnType<typeof mockUseWorkoutSession>> = {}) {
  return {
    session: {
      id: 's1',
      workout_plan_day_id: 'd1',
      gestartet_am: '2026-08-21T10:00:00.000Z',
      beendet_am: null,
      gesamt_kalorien: null,
    },
    exercises: [exercise],
    sets: [],
    loading: false,
    logSet: vi.fn().mockResolvedValue(undefined),
    updateSet: vi.fn().mockResolvedValue(undefined),
    completeSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/training/session/s1']}>
      <Routes>
        <Route path="/training/session/:sessionId" element={<WorkoutSessionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function signedIn(weight: number | null = 80) {
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: weight }, loading: false, error: false })
}

describe('WorkoutSessionPage', () => {
  it('lists the exercises of the day', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
  })

  it('logs a set and starts the pause timer', async () => {
    // shouldAdvanceTime: waitFor runs on its own timers and would never resolve
    // under fully frozen fake ones.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(result.logSet).toHaveBeenCalledWith('ex1', 1, 60, 10))
    expect(screen.getByText(/Pause/)).toBeInTheDocument()
  })

  it('opens the next exercise once the pause of the last set of the current one runs out', async () => {
    // shouldAdvanceTime: waitFor runs on its own timers and would never resolve
    // under fully frozen fake ones.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signedIn()
    const secondExercise = { ...exercise, exercise_id: 'ex2', name: 'Kniebeuge', reihenfolge: 2 }
    // One target set on the first exercise, already logged: its pause ending
    // means the exercise is done, so the next one must open by itself.
    const result = sessionResult({
      exercises: [{ ...exercise, ziel_saetze: 1 }, secondExercise],
      sets: [
        {
          id: 'set1',
          exercise_id: 'ex1',
          satz_nummer: 1,
          gewicht: 60,
          wiederholungen: 10,
          abgeschlossen_am: '2026-08-21T10:05:00.000Z',
          exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
        },
      ],
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.getByText(/Pause/)).toBeInTheDocument())

    await act(async () => {
      vi.advanceTimersByTime(90_000)
    })

    // The pause is over and the first exercise has no sets left, so the form
    // now belongs to the second exercise.
    await waitFor(() => expect(screen.queryByText(/Pause/)).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Satz abschließen' })).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge').closest('li')).toContainElement(
      screen.getByRole('button', { name: 'Satz abschließen' }),
    )
  })

  it('completes the session using the profile weight', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    await waitFor(() => expect(result.completeSession).toHaveBeenCalledWith(80))
  })

  it('shows a dash instead of completing when no weight is on the profile', async () => {
    signedIn(null)
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    expect(screen.getByText('—')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    await waitFor(() => expect(result.completeSession).not.toHaveBeenCalled())
  })

  it('reports a failed set instead of pretending it was stored', async () => {
    signedIn()
    const result = sessionResult({ logSet: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.queryByText(/Pause/)).not.toBeInTheDocument()
  })

  it('reports a session that no longer exists instead of showing an empty workout', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ session: null, exercises: [], sets: [] }))

    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  it('refuses to run a session that is already finished', async () => {
    signedIn()
    const result = sessionResult({
      session: {
        id: 's1',
        workout_plan_day_id: 'd1',
        gestartet_am: '2026-08-20T10:00:00.000Z',
        beendet_am: '2026-08-20T11:00:00.000Z',
        gesamt_kalorien: 400,
      },
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('bereits abgeschlossen')
    expect(screen.queryByRole('button', { name: 'Training abschließen' })).not.toBeInTheDocument()
  })

  it('waits for the profile instead of claiming there is no weight', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseProfile.mockReturnValue({ profile: null, loading: true, error: false })
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(screen.getByText('Lädt…')).toBeInTheDocument()
    expect(screen.queryByText(/Ohne Gewicht im Profil/)).not.toBeInTheDocument()
  })

  it('keeps the typed values when the set could not be stored', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ logSet: vi.fn().mockRejectedValue(new Error('boom')) }))

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('60')
    expect(screen.getByLabelText('Wiederholungen')).toHaveValue('10')
  })
})
