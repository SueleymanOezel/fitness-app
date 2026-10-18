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

  it('renders only the first 50 hits, shows the rest on demand, and still finds hits beyond them by search', () => {
    const viele: PickableExercise[] = Array.from({ length: 120 }, (_, index) => ({
      ...benchPress,
      id: `ex${index}`,
      name: `Übung ${String(index).padStart(3, '0')}`,
      name_de: `Übung ${String(index).padStart(3, '0')}`,
    }))
    render(<ExercisePicker exercises={viele} alreadyAdded={[]} onAddSelected={vi.fn()} />)

    expect(screen.getAllByRole('button', { name: /^Übung \d{3}/ })).toHaveLength(50)
    fireEvent.click(screen.getByRole('button', { name: 'Mehr anzeigen (70 weitere)' }))
    expect(screen.getAllByRole('button', { name: /^Übung \d{3}/ })).toHaveLength(100)

    fireEvent.change(screen.getByLabelText('Übung suchen'), { target: { value: 'Übung 119' } })
    expect(screen.getAllByRole('button', { name: /^Übung \d{3}/ })).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Mehr anzeigen/ })).not.toBeInTheDocument()
  })
})
