import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ExercisePicker, { type PickableExercise } from './ExercisePicker'

afterEach(() => cleanup())

const benchPress: PickableExercise = {
  id: 'ex1',
  name: 'Bench Press',
  name_de: 'Bankdrücken',
  muskelgruppen_primaer: ['chest'],
  muskelgruppen_sekundaer: null,
  equipment: 'barbell',
  bild_url: null,
}

const squat: PickableExercise = {
  id: 'ex2',
  name: 'Squat',
  name_de: 'Kniebeuge',
  muskelgruppen_primaer: ['quadriceps'],
  muskelgruppen_sekundaer: null,
  equipment: 'barbell',
  bild_url: null,
}

describe('ExercisePicker', () => {
  it('lists the selectable exercises by their German name', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Bankdrücken/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('excludes exercises already added', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={['ex1']} onAddSelected={vi.fn()} />)

    expect(screen.queryByRole('button', { name: /Bankdrücken/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('filters by search', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Kniebeuge' } })

    expect(screen.queryByRole('button', { name: /Bankdrücken/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kniebeuge/ })).toBeInTheDocument()
  })

  it('toggles a selection and updates the Hinzufügen count', () => {
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    const row = screen.getByRole('button', { name: /Bankdrücken/ })
    fireEvent.click(row)

    expect(row).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hinzufügen (1)' })).toBeEnabled()
  })

  it('calls onAddSelected with every selected exercise id', () => {
    const onAddSelected = vi.fn()
    render(<ExercisePicker exercises={[benchPress, squat]} alreadyAdded={[]} onAddSelected={onAddSelected} />)

    fireEvent.click(screen.getByRole('button', { name: /Bankdrücken/ }))
    fireEvent.click(screen.getByRole('button', { name: /Kniebeuge/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Hinzufügen (2)' }))

    expect(onAddSelected).toHaveBeenCalledWith(['ex1', 'ex2'])
  })

  it('shows a message instead of an empty list when nothing matches', () => {
    render(<ExercisePicker exercises={[benchPress]} alreadyAdded={['ex1']} onAddSelected={vi.fn()} />)

    expect(screen.getByText('Keine Übungen gefunden.')).toBeInTheDocument()
  })
})
