import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'

const mockUseSession = vi.fn()
vi.mock('../hooks/use-session', () => ({ useSession: () => mockUseSession() }))

const mockUseExercises = vi.fn()
vi.mock('../hooks/use-exercises', () => ({ useExercises: (userId: string) => mockUseExercises(userId) }))

afterEach(() => cleanup())

const exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  met_wert: 5,
  created_by: null,
}

function exercisesResult(overrides: Partial<ReturnType<typeof mockUseExercises>> = {}) {
  return {
    exercises: [exercise],
    loading: false,
    error: false,
    createExercise: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('ExercisesPage', () => {
  it('lists exercises and filters by name as the user types', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [exercise, { ...exercise, id: 'ex2', name: 'Kniebeuge' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Bank' } })

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()
  })

  it('creates an own exercise', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult()
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText('MET-Wert'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.createExercise).toHaveBeenCalledWith({
        name: 'Meine Übung',
        kategorie: 'strength',
        met_wert: 4,
      }),
    )
  })

  it('refuses to save an incomplete form instead of storing a zero MET value', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult()
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(result.createExercise).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('reports a failed save instead of closing the form', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult({ createExercise: vi.fn().mockRejectedValue(new Error('boom')) })
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText('MET-Wert'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })

  it('reports a failed load instead of presenting a partial library as complete', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(exercisesResult({ exercises: [], error: true }))

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByLabelText('Suche')).not.toBeInTheDocument()
  })
})
