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

function loggedSet(overrides: Record<string, unknown> = {}) {
  return {
    id: 'set1',
    exercise_id: 'ex1',
    satz_nummer: 1,
    gewicht: 60,
    wiederholungen: 10,
    rir: null,
    ist_aufwaermsatz: false,
    abgeschlossen_am: '2026-08-21T10:05:00.000Z',
    exercise: { id: 'ex1', name: 'Bankdrücken', met_wert: 5 },
    ...overrides,
  }
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

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, {
        gewicht: 60,
        wiederholungen: 10,
        rir: null,
        ist_aufwaermsatz: false,
      }),
    )
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

  it('says all sets are logged instead of counting past the target', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        exercises: [{ ...exercise, ziel_saetze: 1 }],
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
      }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.getByText('Alle Sätze erfasst')).toBeInTheDocument()
    expect(screen.queryByText('Satz 2 von 1')).not.toBeInTheDocument()
  })

  it('keeps counting when the target is zero, which means no target was set', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ exercises: [{ ...exercise, ziel_saetze: 0 }] }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.getByText('Satz 1 von 0')).toBeInTheDocument()
    expect(screen.queryByText('Alle Sätze erfasst')).not.toBeInTheDocument()
  })

  it('does not count a warm-up set against the set target', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 'w2', satz_nummer: 2, ist_aufwaermsatz: true }),
        ],
      }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    // Two warm-ups are done, but the first working set is still ahead.
    expect(screen.getByText('Satz 1 von 2')).toBeInTheDocument()
  })

  it('numbers a set after every earlier set, warm-ups included', async () => {
    signedIn()
    const result = sessionResult({
      sets: [
        loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true }),
        loggedSet({ id: 's1', satz_nummer: 2 }),
      ],
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    // Third row in the table even though it is only the second working set —
    // satz_nummer is a running order, not the target counting.
    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 3, expect.objectContaining({ rir: null })),
    )
  })

  it('announces a warm-up instead of a set number while the flag is set', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByLabelText('Aufwärmsatz'))

    expect(screen.getByText('Aufwärmsatz — zählt nicht zum Ziel')).toBeInTheDocument()
    expect(screen.queryByText('Satz 1 von 2')).not.toBeInTheDocument()
  })

  it('sends the chosen effort rating and clears it after the set', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, expect.objectContaining({ rir: 2 })),
    )
    // A rating carried over to the next set would be a value the user never gave.
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('clears an effort rating when the same value is tapped again', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(screen.getByRole('button', { name: '3' })).toHaveAttribute('aria-pressed', 'false')
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
