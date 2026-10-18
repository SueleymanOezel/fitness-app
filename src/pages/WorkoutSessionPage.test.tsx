import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import WorkoutSessionPage, { formatPause } from './WorkoutSessionPage'
import { renderWithProviders } from '../test-render'
import { WIEDERHOLUNGEN_FEHLER, GEWICHT_FEHLER } from '../lib/set-values'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseProfile = vi.fn()
vi.mock('../hooks/use-profile', () => ({ useProfile: (userId: string) => mockUseProfile(userId) }))

const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))

const mockUseWorkoutSession = vi.fn()
vi.mock('../hooks/use-workout-session', () => ({
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const exercise = {
  id: 'se1',
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
    completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:20:00.000Z', gesamtKalorien: 187 }),
    ermittleNeueRekorde: vi.fn().mockResolvedValue([]),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    addExercisesToSession: vi.fn().mockResolvedValue(undefined),
    removeExerciseFromSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<WorkoutSessionPage />, {
    route: '/training/session/s1',
    path: '/training/session/:sessionId',
  })
}

function signedIn(weight: number | null = 80) {
  mockNavigate.mockClear()
  mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
  mockUseProfile.mockReturnValue({ profile: { aktuelles_gewicht: weight }, loading: false, error: false })
  mockUseExercises.mockReturnValue({ exercises: [], loading: false, createExercise: vi.fn() })
  mockUseTrainingStreak.mockReturnValue({ streak: 0, loading: false })
}

describe('formatPause', () => {
  it('formats seconds as m:ss', () => {
    expect(formatPause(90)).toBe('1:30')
    expect(formatPause(5)).toBe('0:05')
    expect(formatPause(0)).toBe('0:00')
  })
})

describe('WorkoutSessionPage', () => {
  it('lists the exercises of the day', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(await screen.findByText('Bankdrücken')).toBeInTheDocument()
  })

  it('adds an exercise to the session via the picker', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          muskelgruppen_sekundaer: null,
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (1)' }))

    await waitFor(() => expect(result.addExercisesToSession).toHaveBeenCalledWith(['ex2']))
  })

  it('shows a remove button for an exercise with no logged sets, and removes it', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'Entfernen' }))

    await waitFor(() => expect(result.removeExerciseFromSession).toHaveBeenCalledWith('se1'))
  })

  it('hides the remove button once a set has been logged for that exercise', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()

    expect(screen.queryByRole('button', { name: 'Entfernen' })).not.toBeInTheDocument()
  })

  it('hides the remove button when only a warm-up set has been logged for that exercise', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ sets: [loggedSet({ id: 'set1', ist_aufwaermsatz: true })] }),
    )

    renderPage()

    expect(screen.queryByRole('button', { name: 'Entfernen' })).not.toBeInTheDocument()
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

  it('lists all logged sets, numbering only the working sets', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'set1', satz_nummer: 1, gewicht: 60, wiederholungen: 10 }),
          loggedSet({ id: 'set2', satz_nummer: 2, gewicht: 20, wiederholungen: 12, ist_aufwaermsatz: true }),
          loggedSet({ id: 'set3', satz_nummer: 3, gewicht: 65, wiederholungen: 8 }),
        ],
      }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.queryByText('1 Aufwärmsatz')).not.toBeInTheDocument()
    const tabelle = screen.getByRole('table', { name: 'Erfasste Sätze' })
    expect(within(tabelle).getByRole('columnheader', { name: 'RIR' })).toBeInTheDocument()
    // Header + working set 1 + warm-up + working set 2, in the order they were logged.
    const zeilen = within(tabelle).getAllByRole('row')
    expect(zeilen).toHaveLength(4)
    expect(within(zeilen[1]).getByRole('button', { name: 'Satz 1 bearbeiten' })).toBeInTheDocument()
    expect(zeilen[1]).toHaveTextContent('60')
    expect(zeilen[1]).toHaveTextContent('10')
    expect(zeilen[1]).toHaveTextContent('—') // rir der Fixture ist null
    expect(within(zeilen[2]).getByRole('button', { name: 'Aufw. 1 bearbeiten' })).toBeInTheDocument()
    expect(zeilen[2]).toHaveTextContent('Aufw.')
    expect(zeilen[2]).toHaveTextContent('20')
    expect(within(zeilen[3]).getByRole('button', { name: 'Satz 2 bearbeiten' })).toBeInTheDocument()
    expect(zeilen[3]).toHaveTextContent('65')
    expect(zeilen[1]).not.toHaveClass('row-in') // beim Aufklappen vorhandener Sätze keine Einblendung
  })

  it('reveals only the newly logged set', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    // Next render of the hook returns a second set (new id), as after a real log.
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [loggedSet({ id: 'set1' }), loggedSet({ id: 'set2', satz_nummer: 2, gewicht: 65, wiederholungen: 8 })],
      }),
    )
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '65' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(3))
    const zeilen = screen.getAllByRole('row')
    expect(zeilen[1]).not.toHaveClass('row-in')
    expect(zeilen[2]).toHaveClass('row-in')
  })

  it('shows no warm-up count when every logged set was a working set', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    // The plain "Aufwärmsatz" checkbox label must stay — only the "N
    // Aufwärmsatz(e)" count line is what must be absent here.
    expect(screen.queryByText(/^\d+ Aufwärmsatz/)).not.toBeInTheDocument()
  })

  it('shows no logged-sets list before any set was entered', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.queryByRole('table', { name: 'Erfasste Sätze' })).not.toBeInTheDocument()
  })

  it('shows warm-ups as their own rows instead of a count', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'set1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 'set2', satz_nummer: 2, ist_aufwaermsatz: true }),
        ],
      }),
    )

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.queryByText(/^\d+ Aufwärmsätze?$/)).not.toBeInTheDocument()
    const zeilen = within(screen.getByRole('table', { name: 'Erfasste Sätze' })).getAllByRole('row')
    expect(zeilen).toHaveLength(3) // header + 2 warm-ups
    expect(zeilen[1]).toHaveTextContent('Aufw.')
    expect(zeilen[2]).toHaveTextContent('Aufw.')
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
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
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
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
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

  it('pins the finish action above the nav and labels the body weight', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    expect(screen.getByRole('button', { name: 'Training abschließen' })).toHaveClass('sticky')
    expect(screen.getByText('Körpergewicht für die kcal-Berechnung')).toBeInTheDocument()
  })

  it('renders the exercise name as a borderless card header', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    expect(await screen.findByRole('button', { name: 'Bankdrücken' })).toHaveClass('border-0')
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

  it('still completes without a profile weight, just without calories, and links to the profile', async () => {
    signedIn(null)
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gewicht im Profil eintragen' })).toHaveAttribute('href', '/profile')
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    await waitFor(() => expect(result.completeSession).toHaveBeenCalledWith(null))
  })

  it('stores a weight typed with a decimal comma', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '22,5' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, expect.objectContaining({ gewicht: 22.5, wiederholungen: 8 })),
    )
  })

  it('refuses an invalid weight or negative reps instead of storing the set without them', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveAttribute('inputmode', 'decimal')
    expect(screen.getByLabelText('Wiederholungen')).toHaveAttribute('inputmode', 'numeric')

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    expect(await screen.findByText(GEWICHT_FEHLER)).toBeInTheDocument()
    expect(screen.getByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(result.logSet).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('abc')
  })

  it('shows the completion screen with duration, calories and streak after finishing', async () => {
    signedIn()
    const result = sessionResult({
      completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:25:00.000Z', gesamtKalorien: 187.4 }),
    })
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseTrainingStreak.mockReturnValue({ streak: 3, loading: false })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('25')).toHaveAttribute('data-count-to', '25')
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.getByText('187')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
    expect(screen.getByText('3 Tage in Folge')).toBeInTheDocument()
    // The live session view is gone, not just covered.
    expect(screen.queryByRole('button', { name: 'Training abschließen' })).not.toBeInTheDocument()
  })

  it('shows only the duration when no calories were computed', async () => {
    signedIn()
    const result = sessionResult({
      completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:25:00.000Z', gesamtKalorien: null }),
    })
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseTrainingStreak.mockReturnValue({ streak: 3, loading: false })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.queryByText('kcal')).toBeNull()
  })

  it('never shows the "already completed" fallback while completion is still in flight', async () => {
    signedIn()
    const base = sessionResult()
    // The mocked hook owns real React state, so that the reload() simulation
    // below produces a genuine re-render (not just a mutated closure variable
    // that nothing re-renders on) — matching how the real useWorkoutSession's
    // reload() flips session.beendet_am via setState before
    // ermittleNeueRekorde() (called after, still inside complete()) resolves.
    mockUseWorkoutSession.mockImplementation(() => {
      const [session, setSession] = useState<Omit<typeof base.session, 'beendet_am'> & { beendet_am: string | null }>(
        base.session,
      )
      return {
        ...base,
        session,
        completeSession: vi.fn().mockImplementation(async () => {
          act(() => {
            setSession({ ...base.session, beendet_am: '2026-08-21T10:20:00.000Z' })
          })
          // Still in flight after the reload-equivalent render committed —
          // mirrors ermittleNeueRekorde() not having resolved yet.
          await Promise.resolve()
          return { beendetAm: '2026-08-21T10:25:00.000Z', gesamtKalorien: 187 }
        }),
      }
    })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    // The synchronous part of completeSession() (including our simulated
    // reload) has already committed its render by the time fireEvent.click
    // returns; abschluss is still null at this point. This is exactly the
    // window the pre-fix code falls through to the "already completed" guard.
    expect(screen.queryByText('Dieses Training ist bereits abgeschlossen.')).not.toBeInTheDocument()

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Dieses Training ist bereits abgeschlossen.')).not.toBeInTheDocument()
  })

  it('shows new personal records on the completion screen', async () => {
    signedIn()
    const result = sessionResult({
      ermittleNeueRekorde: vi.fn().mockResolvedValue([
        { exercise_id: 'ex1', name: 'Bankdrücken', neuesEinsRM: 116.7, altesEinsRM: 105 },
        { exercise_id: 'ex2', name: 'Kniebeuge', neuesEinsRM: 80, altesEinsRM: null },
      ]),
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Neue Rekorde')).toBeInTheDocument()
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByText('116,7 kg')).toBeInTheDocument()
    expect(screen.getByText('vorher: 105,0 kg')).toBeInTheDocument()
    expect(screen.getByText('80,0 kg')).toBeInTheDocument()
    expect(screen.getByText('erste Ausführung')).toBeInTheDocument()
  })

  it('omits the records section instead of showing an empty one', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument()
  })

  it('still shows the completion screen when determining new records fails', async () => {
    signedIn()
    const result = sessionResult({ ermittleNeueRekorde: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument()
  })

  it('does not navigate immediately after completing the session', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    await screen.findByText('Training abgeschlossen')

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /training once Fertig is pressed on the completion screen', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    await screen.findByText('Training abgeschlossen')

    fireEvent.click(screen.getByRole('button', { name: 'Fertig' }))

    expect(mockNavigate).toHaveBeenCalledWith('/training')
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

  it('refuses a completely empty set and says why', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(screen.getByLabelText('Wiederholungen')).toHaveAttribute('aria-invalid', 'true')
    expect(result.logSet).not.toHaveBeenCalled()
  })

  it('refuses zero repetitions', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(result.logSet).not.toHaveBeenCalled()
  })

  it('stores a bodyweight set without a weight', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, expect.objectContaining({ gewicht: null, wiederholungen: 8 })),
    )
  })

  it('clears the message once the set is valid', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))
    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Satz abschließen' }))

    await waitFor(() => expect(screen.queryByText(WIEDERHOLUNGEN_FEHLER)).not.toBeInTheDocument())
  })

  it('keeps the working-set counting when a warm-up comes first', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 's1', satz_nummer: 2 }),
          loggedSet({ id: 's2', satz_nummer: 3 }),
        ],
      }),
    )

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.getByRole('button', { name: 'Satz 1 bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satz 2 bearbeiten' })).toBeInTheDocument()
    // Two working sets of two targets are done: the form announces that, warm-up not counted.
    expect(screen.getByText('Alle Sätze erfasst')).toBeInTheDocument()
  })

  it('opens the edit dialog by tapping a row and saves the correction', async () => {
    signedIn()
    const result = sessionResult({ sets: [loggedSet({ id: 'set1', gewicht: 60, wiederholungen: 10 })] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(within(screen.getByRole('table', { name: 'Erfasste Sätze' })).getAllByRole('row')[1])

    const dialog = within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
    fireEvent.change(dialog.getByLabelText('Wiederholungen'), { target: { value: '12' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('set1', {
        gewicht: 60,
        wiederholungen: 12,
        rir: null,
        ist_aufwaermsatz: false,
      }),
    )
    expect(result.updateSet).toHaveBeenCalledTimes(1)
  })

  it('opens the dialog exactly once when the row button is used (keyboard / screen reader)', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Satz 1 bearbeiten' }))

    expect(screen.getAllByRole('heading', { name: 'Satz bearbeiten' })).toHaveLength(1)
  })

  it('numbers several warm-ups so every row button has its own name and a focus ring', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [
          loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 'w2', satz_nummer: 2, ist_aufwaermsatz: true }),
          loggedSet({ id: 'a1', satz_nummer: 3 }),
        ],
      }),
    )

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))

    expect(screen.getByRole('button', { name: 'Aufw. 1 bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Aufw. 2 bearbeiten' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Satz 1 bearbeiten' }).className).toContain('focus-visible:ring-offset-2')
  })

  it('lets a warm-up be turned into a working set from the dialog', async () => {
    signedIn()
    const result = sessionResult({ sets: [loggedSet({ id: 'w1', satz_nummer: 1, ist_aufwaermsatz: true })] })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: 'Aufw. 1 bearbeiten' }))

    const dialog = within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
    expect(dialog.getByLabelText('Aufwärmsatz')).toBeChecked()
    fireEvent.click(dialog.getByLabelText('Aufwärmsatz'))
    fireEvent.click(dialog.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.updateSet).toHaveBeenCalledWith('w1', expect.objectContaining({ ist_aufwaermsatz: false })),
    )
  })
})
