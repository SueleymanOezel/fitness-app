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

const exercise = {
  id: 'ex1',
  name: 'Bench Press',
  name_de: 'Bankdrücken',
  muskelgruppen_primaer: ['chest'],
  equipment: 'barbell',
  bild_url: null,
}

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
    addExercisesToDay: vi.fn().mockResolvedValue(undefined),
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

  it('shows a thumbnail for an exercise already in the day', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const withImage = { ...exercise, bild_url: 'https://example.com/bank.jpg' }
    mockUseWorkoutPlan.mockReturnValue(
      planResult({
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
                exercise: withImage,
              },
            ],
          },
        ],
      }),
    )
    mockUseExercises.mockReturnValue({ exercises: [withImage], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    expect(screen.getByAltText('')).toHaveAttribute('src', 'https://example.com/bank.jpg')
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

  it('adds an exercise to a day via the picker dialog by clicking its row directly', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    // No search typed — the full selectable list is visible immediately.
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (1)' }))

    await waitFor(() => expect(result.addExercisesToDay).toHaveBeenCalledWith('d1', ['ex2']))
    // The dialog closes itself once the selected exercises are added.
    await waitFor(() => expect(screen.queryByLabelText('Übung suchen')).not.toBeInTheDocument())
  })

  it('finds an exercise in the picker by its German translated name', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Bench Press Variation',
          name_de: 'Bankdrücken-Variante',
          muskelgruppen_primaer: ['chest'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Bankdrücken-Variante' } })

    // ex2's raw English name has no "Bankdrücken" substring — a match here
    // can only come from searching the translated name.
    expect(screen.getByRole('button', { name: /Bankdrücken-Variante/ })).toBeInTheDocument()
  })

  it('excludes exercises already in the day from the picker', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    // ex1 ("Bankdrücken") is already in Tag A's exercise list.
    expect(screen.queryByRole('button', { name: /Bankdrücken/ })).not.toBeInTheDocument()
  })

  it('shows a message instead of an empty list when every exercise is already in the day', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({ exercises: [exercise], loading: false, createExercise: vi.fn() })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument()
  })

  it('shows a message instead of an empty list when the search matches nothing', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')

    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'xyz' } })

    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument()
  })

  it('toggles an exercise selection and updates the Hinzufügen count', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')
    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    expect(screen.getByRole('button', { name: 'Hinzufügen (0)' })).toBeDisabled()

    const row = screen.getByRole('button', { name: /Kniebeuge/ })
    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hinzufügen (1)' })).toBeEnabled()

    fireEvent.click(row)
    expect(row).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Hinzufügen (0)' })).toBeDisabled()
  })

  it('adds every selected exercise in the order selected and closes the dialog once', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult()
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
        {
          id: 'ex3',
          name: 'Deadlift',
          name_de: 'Kreuzheben',
          muskelgruppen_primaer: ['hamstrings'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')
    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kreuzheben/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (2)' }))

    await waitFor(() => expect(result.addExercisesToDay).toHaveBeenCalledWith('d1', ['ex2', 'ex3']))
    await waitFor(() => expect(screen.queryByLabelText('Übung suchen')).not.toBeInTheDocument())
  })

  it('closes the picker immediately and reports a failed add via a toast', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = planResult({ addExercisesToDay: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseWorkoutPlan.mockReturnValue(result)
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')
    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (1)' }))

    // The dialog closes immediately, before the write settles — a toast
    // raised while it's still open would render invisible behind its
    // native top-layer backdrop.
    expect(screen.queryByLabelText('Übung suchen')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Übung hinzufügen fehlgeschlagen.'))
  })

  it('groups the picker by muscle group and filters with the muscle-group chip', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise, // chest, already added to the day -> excluded from the picker
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
        {
          id: 'ex3',
          name: 'Curl',
          name_de: 'Bizeps-Curl',
          muskelgruppen_primaer: ['biceps'],
          equipment: 'dumbbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')
    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    expect(screen.getByRole('heading', { name: 'Bizeps' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quadrizeps' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Quadrizeps' }))

    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Bizeps-Curl/ })).not.toBeInTheDocument()
  })

  it('shows equipment and muscle group as a caption for each exercise in the picker', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseWorkoutPlan.mockReturnValue(planResult())
    mockUseExercises.mockReturnValue({
      exercises: [
        exercise,
        {
          id: 'ex2',
          name: 'Squat',
          name_de: 'Kniebeuge',
          muskelgruppen_primaer: ['quadriceps'],
          equipment: 'barbell',
          bild_url: null,
        },
      ],
      loading: false,
      createExercise: vi.fn(),
    })

    renderPage()
    await screen.findByText('Tag A')
    fireEvent.click(screen.getByRole('button', { name: 'Übung hinzufügen' }))

    expect(screen.getByText('Langhantel · Quadrizeps')).toBeInTheDocument()
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
      days: [{ ...result.days[0] }, { id: 'd2', name: 'Tag B', reihenfolge: 2, exercises: [] }],
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
