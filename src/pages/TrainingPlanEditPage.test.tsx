import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import TrainingPlanEditPage from './TrainingPlanEditPage'
import { renderWithProviders } from '../test-render'

const mockUseWorkoutPlan = vi.fn()
vi.mock('../hooks/use-workout-plans', () => ({ useWorkoutPlan: (planId: string) => mockUseWorkoutPlan(planId) }))

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))

afterEach(() => cleanup())

const exercise = { id: 'ex1', name: 'Bankdrücken' }

function planResult(overrides: Partial<ReturnType<typeof mockUseWorkoutPlan>> = {}) {
  return {
    plan: { id: 'p1', name: 'Ganzkörper', aktiv: false },
    days: [
      {
        id: 'd1',
        name: 'Tag A',
        reihenfolge: 1,
        exercises: [
          {
            id: 'de1',
            exercise_id: 'ex1',
            reihenfolge: 1,
            ziel_saetze: 3,
            ziel_wiederholungen: 10,
            pausenzeit_sekunden: 90,
            exercise,
          },
        ],
      },
    ],
    loading: false,
    renamePlan: vi.fn().mockResolvedValue(undefined),
    addDay: vi.fn().mockResolvedValue(undefined),
    renameDay: vi.fn().mockResolvedValue(undefined),
    deleteDay: vi.fn().mockResolvedValue(undefined),
    moveDay: vi.fn().mockResolvedValue(undefined),
    addExerciseToDay: vi.fn().mockResolvedValue(undefined),
    updateDayExercise: vi.fn().mockResolvedValue(undefined),
    removeDayExercise: vi.fn().mockResolvedValue(undefined),
    moveDayExercise: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function renderPage() {
  return renderWithProviders(<TrainingPlanEditPage />, {
    route: '/training/plans/p1',
    path: '/training/plans/:planId',
  })
}

describe('TrainingPlanEditPage', () => {
  it('shows the day with its exercise and target values', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()

    expect(await screen.findByText('Tag A')).toBeInTheDocument()
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByLabelText('Sätze')).toHaveValue(3)
  })

  it('adds a new day', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.change(screen.getByLabelText('Neuer Tag'), { target: { value: 'Tag B' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tag hinzufügen' }))

    await waitFor(() => expect(result.addDay).toHaveBeenCalledWith('Tag B'))
  })

  it('adds an exercise to a day via a picker dialog', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [exercise, { id: 'ex2', name: 'Kniebeuge' }],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kniebeuge hinzufügen' }))

    await waitFor(() => expect(result.addExerciseToDay).toHaveBeenCalledWith('d1', 'ex2'))
    // The dialog closes itself once an exercise is picked.
    expect(screen.queryByLabelText('Übung suchen')).not.toBeInTheDocument()
  })

  it('writes a target value once on blur, not on every keystroke', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    const field = screen.getByLabelText('Sätze')
    fireEvent.change(field, { target: { value: '1' } })
    fireEvent.change(field, { target: { value: '12' } })
    expect(result.updateDayExercise).not.toHaveBeenCalled()

    fireEvent.blur(field)
    await waitFor(() => expect(result.updateDayExercise).toHaveBeenCalledTimes(1))
    expect(result.updateDayExercise).toHaveBeenCalledWith('de1', { ziel_saetze: 12 })
  })

  it('rejects a fractional target, which the integer column would round away', async () => {
    // ziel_saetze, ziel_wiederholungen and pausenzeit_sekunden are all integer
    // columns: 2.6 would come back from the reload as 3.
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    const field = screen.getByLabelText('Sätze')
    fireEvent.change(field, { target: { value: '2.6' } })
    fireEvent.blur(field)

    expect(result.updateDayExercise).not.toHaveBeenCalled()
  })

  it('clears a target value instead of storing zero when the field is emptied', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    const field = screen.getByLabelText('Sätze')
    fireEvent.change(field, { target: { value: '' } })
    fireEvent.blur(field)

    await waitFor(() => expect(result.updateDayExercise).toHaveBeenCalledWith('de1', { ziel_saetze: null }))
  })

  it('does not write when a target value is left unchanged', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.blur(screen.getByLabelText('Sätze'))

    expect(result.updateDayExercise).not.toHaveBeenCalled()
  })

  it('refuses to add a day without a name', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Tag hinzufügen' }))

    expect(result.addDay).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('reports a failed write instead of swallowing it', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult({ moveDay: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutPlan.mockReturnValue({
      ...result,
      days: [
        { ...result.days[0] },
        { id: 'd2', name: 'Tag B', reihenfolge: 2, exercises: [] },
      ],
    })
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getAllByRole('button', { name: 'Tag nach unten' })[0])

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
  })

  it('reports a plan that no longer exists instead of loading forever', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult({ plan: null, days: [] }))
    mockUseExercises.mockReturnValue({ exercises: [], loading: false, createExercise: vi.fn() })

    renderPage()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
