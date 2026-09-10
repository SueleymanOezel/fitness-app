import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ExerciseDetailDialog from './ExerciseDetailDialog'
import type { Exercise } from '../hooks/use-exercises'

afterEach(() => cleanup())

const exercise: Exercise = {
  id: 'ex1',
  name: 'Bankdrücken',
  kategorie: 'strength',
  equipment: 'barbell',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: [],
  bild_url: 'https://example.com/bankdruecken.jpg',
  anleitung: ['Lege dich auf die Bank.', 'Drücke die Stange nach oben.'],
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

  it('shows the instructions as a numbered list', () => {
    render(<ExerciseDetailDialog exercise={exercise} />)
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Lege dich auf die Bank.',
      'Drücke die Stange nach oben.',
    ])
  })

  it('shows a fallback message when there are no instructions', () => {
    render(<ExerciseDetailDialog exercise={{ ...exercise, anleitung: null }} />)
    expect(screen.getByText('Keine Anleitung hinterlegt.')).toBeInTheDocument()
  })

  it('renders a minimal exercise without empty sections', () => {
    const minimal: Exercise = {
      id: 'ex2',
      name: 'Eigene Übung',
      kategorie: 'strength',
      equipment: null,
      muskelgruppen_primaer: null,
      muskelgruppen_sekundaer: null,
      bild_url: null,
      anleitung: null,
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
