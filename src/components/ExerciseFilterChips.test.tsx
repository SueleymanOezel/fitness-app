import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import ExerciseFilterChips from './ExerciseFilterChips'

afterEach(() => cleanup())

describe('ExerciseFilterChips', () => {
  it('renders a chip per muscle group and equipment value, with a reset chip for each row', () => {
    render(
      <ExerciseFilterChips
        muskelgruppen={['chest', 'triceps']}
        muskelgruppe={null}
        onMuskelgruppeChange={vi.fn()}
        equipmentWerte={['barbell']}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Alle' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brust' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trizeps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alle Geräte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Langhantel' })).toBeInTheDocument()
  })

  it('calls onMuskelgruppeChange with the raw value when a muscle-group chip is clicked', () => {
    const onMuskelgruppeChange = vi.fn()
    render(
      <ExerciseFilterChips
        muskelgruppen={['chest']}
        muskelgruppe={null}
        onMuskelgruppeChange={onMuskelgruppeChange}
        equipmentWerte={[]}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
    expect(onMuskelgruppeChange).toHaveBeenCalledWith('chest')
  })

  it('calls onMuskelgruppeChange with null when the Alle chip is clicked', () => {
    const onMuskelgruppeChange = vi.fn()
    render(
      <ExerciseFilterChips
        muskelgruppen={['chest']}
        muskelgruppe="chest"
        onMuskelgruppeChange={onMuskelgruppeChange}
        equipmentWerte={[]}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Alle' }))
    expect(onMuskelgruppeChange).toHaveBeenCalledWith(null)
  })

  it('calls onEquipmentChange with the raw value when an equipment chip is clicked', () => {
    const onEquipmentChange = vi.fn()
    render(
      <ExerciseFilterChips
        muskelgruppen={[]}
        muskelgruppe={null}
        onMuskelgruppeChange={vi.fn()}
        equipmentWerte={['dumbbell']}
        equipment={null}
        onEquipmentChange={onEquipmentChange}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Kurzhantel' }))
    expect(onEquipmentChange).toHaveBeenCalledWith('dumbbell')
  })

  it('marks the active muscle-group chip', () => {
    render(
      <ExerciseFilterChips
        muskelgruppen={['chest']}
        muskelgruppe="chest"
        onMuskelgruppeChange={vi.fn()}
        equipmentWerte={[]}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Brust' })).toHaveClass('bg-accent')
    expect(screen.getByRole('button', { name: 'Alle' })).toHaveClass('bg-surface')
  })

  it('renders no muscle-group row when there are no muscle-group values', () => {
    render(
      <ExerciseFilterChips
        muskelgruppen={[]}
        muskelgruppe={null}
        onMuskelgruppeChange={vi.fn()}
        equipmentWerte={[]}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Alle' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alle Geräte' })).not.toBeInTheDocument()
  })
})
