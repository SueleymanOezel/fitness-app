import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ExerciseDetailDialog from './ExerciseDetailDialog'
import type { Exercise } from '../hooks/use-exercises'

const mockInstructions = vi.fn()
vi.mock('../hooks/use-exercises', () => ({
  useExerciseInstructions: (id: string) => mockInstructions(id),
}))

beforeEach(() => {
  mockInstructions.mockReturnValue({
    anleitung: ['Lege dich auf die Bank.', 'Drücke die Stange nach oben.'],
    loading: false,
    error: false,
  })
})

afterEach(() => cleanup())

const exercise: Exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  name_de: null,
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: 'https://example.com/bankdruecken.jpg',
  schwierigkeitsgrad: 'intermediate',
  met_wert: 5,
  created_by: null,
}

describe('ExerciseDetailDialog', () => {
  it('renders the image with the exercise name as alt text', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByRole('img', { name: 'Bankdrücken' })).toHaveAttribute(
      'src',
      'https://example.com/bankdruecken.jpg',
    )
  })

  it('renders no image when bild_url is null', () => {
    render(<ExerciseDetailDialog exercise={{ ...exercise, bild_url: null }} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('shows the translated muscle group, equipment and difficulty level', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByText('Brust')).toBeInTheDocument()
    expect(screen.getByText('Langhantel')).toBeInTheDocument()
    expect(screen.getByText('Fortgeschritten')).toBeInTheDocument()
  })

  it('asks for the instructions of exactly this exercise and shows them as a numbered list', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(mockInstructions).toHaveBeenCalledWith('ex1')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Lege dich auf die Bank.',
      'Drücke die Stange nach oben.',
    ])
  })

  it('shows a fallback message when there are no instructions', () => {
    mockInstructions.mockReturnValue({ anleitung: [], loading: false, error: false })
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByText('Keine Anleitung hinterlegt.')).toBeInTheDocument()
  })

  it('shows the German name when it exists', () => {
    render(<ExerciseDetailDialog exercise={{ ...exercise, name: 'Bench Press', name_de: 'Bankdrücken (DE)' }} />)
    expect(screen.getByText('Bankdrücken (DE)')).toBeInTheDocument()
    expect(screen.queryByText('Bench Press')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Bankdrücken (DE)' })).toBeInTheDocument()
  })

  it('shows a loading state instead of "no instructions" while they load', () => {
    mockInstructions.mockReturnValue({ anleitung: [], loading: true, error: false })
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
    expect(screen.queryByText('Keine Anleitung hinterlegt.')).not.toBeInTheDocument()
  })

  it('reports a failed load instead of claiming there are no instructions', () => {
    mockInstructions.mockReturnValue({ anleitung: [], loading: false, error: true })
    render(<ExerciseDetailDialog exercise={exercise} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Anleitung konnte nicht geladen werden.')
    expect(screen.queryByText('Keine Anleitung hinterlegt.')).not.toBeInTheDocument()
  })

  it('renders a minimal exercise without empty sections', () => {
    mockInstructions.mockReturnValue({ anleitung: [], loading: false, error: false })
    const minimal: Exercise = {
      id: 'ex2',
      name: 'Eigene Übung',
      name_de: null,
      kategorie: 'strength',
      equipment: null,
      muskelgruppen_primaer: null,
      muskelgruppen_sekundaer: null,
      bild_url: null,
      schwierigkeitsgrad: null,
      met_wert: 4,
      created_by: 'u1',
    }
    render(<ExerciseDetailDialog exercise={minimal} />)

    expect(screen.getByText('Eigene Übung')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.getByText('Keine Anleitung hinterlegt.')).toBeInTheDocument()
  })
})
