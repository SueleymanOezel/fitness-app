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
const mockUseLetzteWerte = vi.fn<(...args: unknown[]) => Map<string, unknown>>(() => new Map())
vi.mock('../hooks/use-workout-session', () => ({
  useLetzteWerte: (...args: unknown[]) => mockUseLetzteWerte(...args),
  useWorkoutSession: (sessionId: string) => mockUseWorkoutSession(sessionId),
}))

const mockUseTrainingStreak = vi.fn()
vi.mock('../hooks/use-training-streak', () => ({
  useTrainingStreak: (userId: string) => mockUseTrainingStreak(userId),
}))

const mockUseActiveTrainingDay = vi.fn(() => ({ plan: null, day: null, loading: false, error: false, reload: vi.fn() }))
vi.mock('../hooks/use-active-training-day', () => ({ useActiveTrainingDay: () => mockUseActiveTrainingDay() }))

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
    deleteSet: vi.fn().mockResolvedValue(undefined),
    restoreSet: vi.fn().mockResolvedValue(undefined),
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
  mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 0, dieseWoche: 0, ziel: 3 }, loading: false })
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

    fireEvent.click(screen.getByRole('button', { name: /^(?!Ja,).+ entfernen$/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Ja, entfernen' }))

    await waitFor(() => expect(result.removeExerciseFromSession).toHaveBeenCalledWith('se1'))
  })

  it('marks the open exercise as expanded', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    expect(screen.getByRole('button', { name: 'Bankdrücken' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('hides the remove button once a set has been logged for that exercise', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ id: 'set1' })] }))

    renderPage()

    expect(screen.queryByRole('button', { name: /^(?!Ja,).+ entfernen$/ })).not.toBeInTheDocument()
  })

  it('hides the remove button when only a warm-up set has been logged for that exercise', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ sets: [loggedSet({ id: 'set1', ist_aufwaermsatz: true })] }),
    )

    renderPage()

    expect(screen.queryByRole('button', { name: /^(?!Ja,).+ entfernen$/ })).not.toBeInTheDocument()
  })

  it('numbers a new set after the highest used number, so a deleted middle set cannot cause a duplicate', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signedIn()
    // Set 2 was deleted: the count is 2, but number 3 is still in use.
    const result = sessionResult({
      sets: [loggedSet({ id: 'set1', satz_nummer: 1 }), loggedSet({ id: 'set3', satz_nummer: 3 })],
    })
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

    await waitFor(() => expect(result.logSet).toHaveBeenCalledWith('ex1', 4, expect.anything()))
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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

    await waitFor(() => expect(screen.getByText(/Pause/)).toBeInTheDocument())

    await act(async () => {
      vi.advanceTimersByTime(90_000)
    })

    // The pause is over and the first exercise has no sets left, so the form
    // now belongs to the second exercise.
    await waitFor(() => expect(screen.queryByRole('timer')).not.toBeInTheDocument())
    expect(screen.getByRole('status')).toHaveTextContent('Satz 1 von 2 · Kniebeuge')
    expect(screen.getByRole('button', { name: /^Satz abschließen/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Wiederholungen')).toBeInTheDocument()
  })

  it('signals the end of a pause that ran out: accent bar with the next set, and a vibration where available', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))
    await screen.findByRole('timer')

    await act(async () => {
      vi.advanceTimersByTime(90_000)
    })

    const signal = await screen.findByRole('status')
    expect(signal).toHaveTextContent('Pause vorbei')
    // The mock returns the same (empty) set list, so the next set is still number 1 of 2.
    expect(signal).toHaveTextContent('Satz 1 von 2 · Bankdrücken')
    expect(vibrate).toHaveBeenCalledTimes(1)

    // findByRole resolves on the DOM commit; under load the effect that arms the 6 s
    // timeout may not have run yet. An empty act flushes it first.
    await act(async () => {})
    await act(async () => {
      vi.advanceTimersByTime(6_000)
    })
    expect(screen.queryByText('Pause vorbei')).not.toBeInTheDocument()
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('gives no end signal when the pause is skipped by hand', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '60' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))
    await screen.findByRole('timer')

    fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }))

    expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    expect(screen.queryByText('Pause vorbei')).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: 'Aufwärmsatz' }))

    expect(screen.getByText('Aufwärmsatz — zählt nicht zum Ziel')).toBeInTheDocument()
    expect(screen.queryByText('Satz 1 von 2')).not.toBeInTheDocument()
  })

  it('names on the button what a tap stores, and follows the fields', () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())
    renderPage()
    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '72,5' } })
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '8' } })
    expect(screen.getByRole('button', { name: 'Satz abschließen · 72,5 kg × 8' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '' } })
    expect(screen.getByRole('button', { name: 'Satz abschließen · 8 Wdh.' })).toBeInTheDocument()
  })

  it('sends the chosen effort rating and clears it after the set', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()

    fireEvent.click(screen.getByText('Bankdrücken'))
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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

  it('keeps the finish action out of the thumb path: not sticky, not primary, and it asks first', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    const abschliessen = screen.getByRole('button', { name: 'Training abschließen' })
    expect(abschliessen).not.toHaveClass('sticky')
    expect(abschliessen).not.toHaveClass('bg-accent')
    expect(screen.getByText('Körpergewicht für die kcal-Berechnung')).toBeInTheDocument()

    fireEvent.click(abschliessen)
    expect(await screen.findByRole('heading', { name: 'Training abschließen?' })).toBeInTheDocument()
    expect(result.completeSession).not.toHaveBeenCalled()
  })

  // Re-audit 27.10.2026: a session started by mistake could only be finished, landing in history and calories.
  it('discards a session after asking and leaves for the training page', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')
    fireEvent.click(screen.getByRole('button', { name: 'Training verwerfen' }))
    expect(result.deleteSession).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Verwerfen' }))
    await waitFor(() => expect(result.deleteSession).toHaveBeenCalledTimes(1))
    expect(mockNavigate).toHaveBeenCalledWith('/training', { replace: true })
  })

  it('asks whether a session open for hours is still going', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())
    renderPage()
    expect(await screen.findByText('Noch aktiv? Sonst unten abschließen oder verwerfen.')).toBeInTheDocument()

    mockUseWorkoutSession.mockReturnValue(
      sessionResult({ session: { id: 's1', workout_plan_day_id: 'd1', gestartet_am: new Date().toISOString(), beendet_am: null, gesamt_kalorien: null } }),
    )
    cleanup()
    renderPage()
    await screen.findByText('Bankdrücken')
    expect(screen.queryByText(/Noch aktiv\?/)).not.toBeInTheDocument()
  })

  // Re-audit 26.10.2026: the question did not say what was still missing.
  it('names the exercises still open when asking to finish', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        exercises: [exercise, { ...exercise, id: 'se2', exercise_id: 'ex2', name: 'Kniebeuge', reihenfolge: 2, ziel_saetze: 3 }],
        sets: [loggedSet({ id: 'a', satz_nummer: 1 })],
      }),
    )

    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Training abschließen' }))
    expect(await screen.findByText(/Noch offen: Bankdrücken \(1\/2\), Kniebeuge \(0\/3\)\./)).toBeInTheDocument()
  })

  it('offers the finish in the bottom bar once every target is met, instead of an empty set form', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        exercises: [{ ...exercise, ziel_saetze: 1 }],
        sets: [loggedSet({ id: 'a', satz_nummer: 1 })],
      }),
    )

    renderPage()
    const abschliessen = await screen.findByRole('button', { name: 'Training abschließen' })
    expect(abschliessen).toHaveClass('bg-accent')
    expect(screen.queryByRole('button', { name: /^Satz abschließen/ })).not.toBeInTheDocument()

    fireEvent.click(abschliessen)
    expect(await screen.findByText(/^Alle Sätze geschafft\. 1 Satz erfasst\./)).toBeInTheDocument()
  })

  it('renders the exercise name as a borderless card header', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    expect(await screen.findByRole('button', { name: 'Bankdrücken' })).toHaveClass('border-0')
  })

  // Collapsed cards showed only a name: no sense of how far the whole workout is (re-audit 23.10.2026).
  it('shows each exercise card its set progress, warm-ups not counted', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        exercises: [exercise, { ...exercise, exercise_id: 'ex2', name: 'Kniebeuge', reihenfolge: 2, ziel_saetze: 3 }],
        sets: [
          loggedSet({ id: 'w', satz_nummer: 1, ist_aufwaermsatz: true }),
          loggedSet({ id: 'a', satz_nummer: 2 }),
          loggedSet({ id: 'b', satz_nummer: 3 }),
        ],
      }),
    )

    renderPage()
    expect(await screen.findByText('2 von 2 Sätzen')).toBeInTheDocument()
    expect(screen.getByText('0 von 3 Sätzen')).toBeInTheDocument()
    // The name button keeps its plain accessible name.
    expect(screen.getByRole('button', { name: 'Kniebeuge' })).toBeInTheDocument()
  })

  // Re-audit 24.10.2026: the final action looked like the set button (same check) and sat right above it.
  it('gives "Training abschließen" its own icon, apart from the set check', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())
    renderPage()
    const abschliessen = await screen.findByRole('button', { name: 'Training abschließen' })
    expect(abschliessen.querySelector('svg')).toHaveAttribute('data-icon', 'goal')
    expect(screen.getByRole('button', { name: /^Satz abschließen/ }).querySelector('svg')).toHaveAttribute('data-icon', 'save')
  })

  it('moves focus to the result heading after finishing, so a screen reader hears it', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())
    renderPage()
    await screen.findByText('Bankdrücken')
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))
    const titel = await screen.findByRole('heading', { name: 'Training abgeschlossen' })
    await waitFor(() => expect(titel).toHaveFocus())
  })

  it('completes the session using the profile weight', async () => {
    signedIn()
    const result = sessionResult()
    mockUseWorkoutSession.mockReturnValue(result)

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

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
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 3, dieseWoche: 0, ziel: 3 }, loading: false })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('25')).toHaveAttribute('data-count-to', '25')
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.getByText('187')).toBeInTheDocument()
    expect(screen.getByText('kcal verbraucht')).toBeInTheDocument()
    expect(screen.getByText('3 Wochen in Folge · diese Woche 0 von 3')).toBeInTheDocument()
    // The live session view is gone, not just covered.
    expect(screen.queryByRole('button', { name: 'Training abschließen' })).not.toBeInTheDocument()
  })

  it('adds sets, volume, the comparison with last time and the next plan day', async () => {
    signedIn()
    mockUseLetzteWerte.mockReturnValue(new Map([['ex1', { gewicht: 60, wiederholungen: 10 }]]))
    mockUseActiveTrainingDay.mockReturnValue({
      plan: null,
      // d1 (the day just trained) would be the stale copy and must not show up as "next".
      day: { id: 'd2', name: 'Tag B – Ziehen' },
      loading: false,
      error: false,
      reload: vi.fn(),
    } as never)
    mockUseWorkoutSession.mockReturnValue(
      sessionResult({
        sets: [loggedSet({ id: 'w', gewicht: 40, ist_aufwaermsatz: true }), loggedSet({ id: 'a', satz_nummer: 2, gewicht: 62.5, wiederholungen: 10 })],
      }),
    )

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))
    await screen.findByText('Training abgeschlossen')

    // One value, its unit as the label: no more "Sätze: 1 Satz".
    expect(screen.getByText('Satz', { selector: 'dt' }).closest('div')).toHaveTextContent('1')
    expect(screen.getByText('625')).toHaveAttribute('data-count-to', '625') // 62,5 kg × 10, warm-up left out
    expect(screen.getByText('Im Vergleich zum letzten Mal')).toBeInTheDocument()
    expect(screen.getByText('62,5 kg × 10 · zuletzt 60 kg × 10')).toBeInTheDocument()
    // The step up is the headline and stays in the comparison row.
    expect(screen.getAllByText('+2,5 kg')).toHaveLength(2)
    expect(screen.getByText('Bankdrücken · mehr als beim letzten Mal')).toBeInTheDocument()
    expect(screen.getByText('Nächstes Mal: Tag B – Ziehen')).toBeInTheDocument()
    mockUseLetzteWerte.mockReturnValue(new Map())
  })

  it('does not call the day just trained the next one while the rotation is still a stale copy', async () => {
    signedIn()
    mockUseActiveTrainingDay.mockReturnValue({
      plan: null,
      day: { id: 'd1', name: 'Tag A' },
      loading: false,
      error: false,
      reload: vi.fn(),
    } as never)
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))
    await screen.findByText('Training abgeschlossen')

    expect(screen.queryByText(/Nächstes Mal/)).not.toBeInTheDocument()
    expect(screen.queryByText('Im Vergleich zum letzten Mal')).not.toBeInTheDocument()
  })

  it('shows only the duration when no calories were computed', async () => {
    signedIn()
    const result = sessionResult({
      completeSession: vi.fn().mockResolvedValue({ beendetAm: '2026-08-21T10:25:00.000Z', gesamtKalorien: null }),
    })
    mockUseWorkoutSession.mockReturnValue(result)
    mockUseTrainingStreak.mockReturnValue({ streak: { wochen: 3, dieseWoche: 0, ziel: 3 }, loading: false })

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.getByText('Minuten')).toBeInTheDocument()
    expect(screen.queryByText('kcal verbraucht')).toBeNull()
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
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

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
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

    expect(await screen.findByText('Neue Rekorde')).toBeInTheDocument()
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    // The first record is also the headline.
    expect(screen.getAllByText('≈ 116,7 kg')).toHaveLength(2)
    expect(screen.getByText('Neuer Rekord · Bankdrücken (geschätztes 1RM)')).toBeInTheDocument()
    expect(screen.getByText('geschätztes 1RM · vorher ≈ 105,0 kg')).toBeInTheDocument()
    expect(screen.getByText('≈ 80,0 kg')).toBeInTheDocument()
    expect(screen.getByText('geschätztes 1RM · erste Ausführung')).toBeInTheDocument()
  })

  it('omits the records section instead of showing an empty one', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

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
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))

    expect(await screen.findByText('Training abgeschlossen')).toBeInTheDocument()
    expect(screen.queryByText('Neue Rekorde')).not.toBeInTheDocument()
  })

  it('does not navigate immediately after completing the session', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))
    await screen.findByText('Training abgeschlossen')

    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('navigates to /training once Fertig is pressed on the completion screen', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    await screen.findByText('Bankdrücken')

    fireEvent.click(screen.getByRole('button', { name: 'Training abschließen' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Abschließen' }))
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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

    await waitFor(() =>
      expect(result.logSet).toHaveBeenCalledWith('ex1', 1, expect.objectContaining({ gewicht: null, wiederholungen: 8 })),
    )
  })

  it('clears the message once the set is valid', async () => {
    signedIn()
    mockUseWorkoutSession.mockReturnValue(sessionResult())

    renderPage()
    fireEvent.click(await screen.findByText('Bankdrücken'))
    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))
    expect(await screen.findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Wiederholungen'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

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

  describe('one-handed between sets', () => {
    it('opens on the next set: title is the plan day, elapsed time shows, the form is already there', () => {
      signedIn()
      mockUseWorkoutSession.mockReturnValue(
        sessionResult({
          session: {
            id: 's1',
            workout_plan_day_id: 'd1',
            gestartet_am: new Date(Date.now() - 32 * 60000).toISOString(),
            beendet_am: null,
            gesamt_kalorien: null,
            tag_name: 'Tag A – Drücken',
          },
        }),
      )

      renderPage()

      expect(screen.getByRole('heading', { level: 1, name: 'Tag A – Drücken' })).toBeInTheDocument()
      expect(screen.getByText('Läuft seit 32 min · 0 Sätze')).toBeInTheDocument()
      // No tap on the exercise name needed; reps start at the plan's target.
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('10')
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('')
    })

    it('starts from the last set of today and keeps the values after logging', async () => {
      signedIn()
      const result = sessionResult({ sets: [loggedSet({ gewicht: 72.5, wiederholungen: 8 })] })
      mockUseWorkoutSession.mockReturnValue(result)

      renderPage()
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('72,5')
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('8')

      fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))

      await waitFor(() =>
        expect(result.logSet).toHaveBeenCalledWith('ex1', 2, expect.objectContaining({ gewicht: 72.5, wiederholungen: 8 })),
      )
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('72,5')
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('8')
    })

    it('starts the first set from the last workout and says so', () => {
      signedIn()
      mockUseLetzteWerte.mockReturnValue(new Map([['ex1', { gewicht: 70, wiederholungen: 8, rir: 1 }]]))
      mockUseWorkoutSession.mockReturnValue(sessionResult())

      renderPage()

      expect(screen.getByText('Letztes Mal: 70 kg × 8 · RIR 1')).toBeInTheDocument()
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('70')
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('8')
      mockUseLetzteWerte.mockReturnValue(new Map())
    })

    it('keeps showing the last workout from the second set on', () => {
      signedIn()
      mockUseLetzteWerte.mockReturnValue(new Map([['ex1', { gewicht: 70, wiederholungen: 8, rir: null }]]))
      mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ gewicht: 60, wiederholungen: 10 })] }))

      renderPage()

      expect(screen.getByText('Letztes Mal: 70 kg × 8')).toBeInTheDocument()
      // The fields still start from today's last set, not from the earlier workout.
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('60')
      mockUseLetzteWerte.mockReturnValue(new Map())
    })

    it('puts the pause and "Satz abschließen" into one bottom bar', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      signedIn()
      mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet()] }))

      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))
      const timer = await screen.findByRole('timer')

      const leiste = timer.closest('.fixed')
      expect(leiste).not.toBeNull()
      expect(leiste).toContainElement(screen.getByRole('button', { name: /^Satz abschließen/ }))
    })

    it('changes weight and reps in steps with - and +', () => {
      signedIn()
      mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ gewicht: 60, wiederholungen: 10 })] }))

      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Gewicht (kg): 2,5 kg mehr' }))
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('62,5')
      fireEvent.click(screen.getByRole('button', { name: 'Gewicht (kg): 2,5 kg weniger' }))
      fireEvent.click(screen.getByRole('button', { name: 'Gewicht (kg): 2,5 kg weniger' }))
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('57,5')
      fireEvent.click(screen.getByRole('button', { name: 'Wiederholungen: 1 Wiederholung weniger' }))
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('9')
    })

    it('never steps below the minimum', () => {
      signedIn()
      mockUseWorkoutSession.mockReturnValue(sessionResult({ sets: [loggedSet({ gewicht: 1, wiederholungen: 1 })] }))

      renderPage()
      fireEvent.click(screen.getByRole('button', { name: 'Gewicht (kg): 2,5 kg weniger' }))
      fireEvent.click(screen.getByRole('button', { name: 'Wiederholungen: 1 Wiederholung weniger' }))
      expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue('0')
      expect(screen.getByLabelText('Wiederholungen')).toHaveValue('1')
    })

    it('lets the rest be extended by 30 s or skipped', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      signedIn()
      const result = sessionResult({ sets: [loggedSet()] })
      mockUseWorkoutSession.mockReturnValue(result)

      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /^Satz abschließen/ }))
      expect(await screen.findByRole('timer')).toHaveTextContent('1:30')

      fireEvent.click(screen.getByRole('button', { name: '+30 s' }))
      await waitFor(() => expect(screen.getByRole('timer')).toHaveTextContent(/2:00|1:5[0-9]/))

      fireEvent.click(screen.getByRole('button', { name: 'Überspringen' }))
      expect(screen.queryByRole('timer')).not.toBeInTheDocument()
    })

    it('formats the body weight with a decimal comma', () => {
      signedIn(82.4)
      mockUseWorkoutSession.mockReturnValue(sessionResult())

      renderPage()
      expect(screen.getByText('82,4 kg')).toBeInTheDocument()
    })
  })
})
