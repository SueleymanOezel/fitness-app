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
  name_de: null,
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  anleitung: ['Schritt eins.', 'Schritt zwei.'],
  anleitung_de: null,
  schwierigkeitsgrad: 'beginner',
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

  it('shows the German name and searches by it when a translation exists', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [{ ...exercise, name: 'Bench Press', name_de: 'Bankdrücken' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Bank' } })
    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
  })

  it('sorts the list by the displayed (German) name, not the raw English name', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          { ...exercise, id: 'ex1', name: 'Zebra Press', name_de: 'Aufwärmübung' },
          { ...exercise, id: 'ex2', name: 'Apple Curl', name_de: 'Zusatzübung' },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Aufwärmübung')
    expect(items[1]).toHaveTextContent('Zusatzübung')
  })

  it('filters by muscle group when a chip is selected', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Kniebeuge', muskelgruppen_primaer: ['quadriceps'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brust' })).toHaveClass('bg-accent')
    expect(screen.getByRole('button', { name: 'Alle' })).toHaveClass('bg-surface')
  })

  it('resets the muscle-group filter with the Alle chip', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Kniebeuge', muskelgruppen_primaer: ['quadriceps'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()
  })

  it('combines the muscle-group filter with the name search', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Schrägbankdrücken', muskelgruppen_primaer: ['chest'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
    fireEvent.change(screen.getByLabelText('Suche'), { target: { value: 'Schräg' } })

    expect(screen.queryByText('Bankdrücken')).not.toBeInTheDocument()
    expect(screen.getByText('Schrägbankdrücken')).toBeInTheDocument()
  })

  it('filters by equipment when a chip is selected', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [exercise, { ...exercise, id: 'ex2', name: 'Kniebeuge', equipment: 'dumbbell' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Langhantel' }))

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Langhantel' })).toHaveClass('bg-accent')
    expect(screen.getByRole('button', { name: 'Alle Geräte' })).toHaveClass('bg-surface')
  })

  it('resets the equipment filter with the Alle Geräte chip', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [exercise, { ...exercise, id: 'ex2', name: 'Kniebeuge', equipment: 'dumbbell' }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Langhantel' }))
    expect(screen.queryByText('Kniebeuge')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alle Geräte' }))
    expect(screen.getByText('Kniebeuge')).toBeInTheDocument()
  })

  it('combines the equipment filter with the muscle-group filter', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [
          exercise,
          { ...exercise, id: 'ex2', name: 'Kurzhantel-Kniebeuge', equipment: 'dumbbell', muskelgruppen_primaer: ['chest'] },
        ],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
    fireEvent.click(screen.getByRole('button', { name: 'Langhantel' }))

    expect(screen.getByText('Bankdrücken')).toBeInTheDocument()
    expect(screen.queryByText('Kurzhantel-Kniebeuge')).not.toBeInTheDocument()
  })

  it('hides the equipment filter row when no exercise has an equipment value', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [{ ...exercise, equipment: null }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.queryByRole('button', { name: 'Alle Geräte' })).not.toBeInTheDocument()
  })

  it('shows a thumbnail image for an exercise with a bild_url', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({ exercises: [{ ...exercise, bild_url: 'https://example.com/bankdruecken.jpg' }] }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    const row = screen.getByRole('button', { name: 'Bankdrücken' })
    expect(row.querySelector('img')).toHaveAttribute('src', 'https://example.com/bankdruecken.jpg')
  })

  it('shows a placeholder icon when an exercise has no bild_url', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(exercisesResult({ exercises: [{ ...exercise, bild_url: null }] }))

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    const row = screen.getByRole('button', { name: 'Bankdrücken' })
    expect(row.querySelector('img')).not.toBeInTheDocument()
    expect(row.querySelector('svg')).toBeInTheDocument()
  })

  it('opens the detail dialog with the exercise details when a row is clicked', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(exercisesResult())

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Bankdrücken' }))

    expect(screen.getByText('Schritt eins.')).toBeInTheDocument()
    expect(screen.getByText('Schritt zwei.')).toBeInTheDocument()
  })

  it('hides the filter row when no exercise has a muscle group', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    mockUseExercises.mockReturnValue(
      exercisesResult({
        exercises: [{ ...exercise, muskelgruppen_primaer: null }],
      }),
    )

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    expect(screen.queryByRole('button', { name: 'Alle' })).not.toBeInTheDocument()
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

  it('creates an own exercise with bild url, difficulty level and instructions', async () => {
    mockUseSession.mockReturnValue({ session: { user: { id: 'u1' } }, loading: false })
    const result = exercisesResult()
    mockUseExercises.mockReturnValue(result)

    const { default: ExercisesPage } = await import('./ExercisesPage')
    renderWithProviders(<ExercisesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Eigene Übung anlegen' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Meine Übung' } })
    fireEvent.change(screen.getByLabelText('Kategorie'), { target: { value: 'strength' } })
    fireEvent.change(screen.getByLabelText('MET-Wert'), { target: { value: '4' } })
    fireEvent.change(screen.getByLabelText('Bild-URL'), { target: { value: 'https://example.com/x.jpg' } })
    fireEvent.change(screen.getByLabelText('Schwierigkeitsgrad'), { target: { value: 'beginner' } })
    fireEvent.change(screen.getByLabelText('Anleitung'), {
      target: { value: 'Schritt eins.\n\nSchritt zwei.\n' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(result.createExercise).toHaveBeenCalledWith({
        name: 'Meine Übung',
        kategorie: 'strength',
        met_wert: 4,
        bild_url: 'https://example.com/x.jpg',
        schwierigkeitsgrad: 'beginner',
        anleitung: ['Schritt eins.', 'Schritt zwei.'],
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
