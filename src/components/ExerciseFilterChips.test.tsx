import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import ExerciseFilterChips from './ExerciseFilterChips'

afterEach(() => cleanup())

function renderChips(overrides: Partial<ComponentProps<typeof ExerciseFilterChips>> = {}) {
  const props = {
    muskelgruppen: ['chest', 'triceps'],
    muskelgruppe: null,
    onMuskelgruppeChange: vi.fn(),
    equipmentWerte: ['barbell'],
    equipment: null,
    onEquipmentChange: vi.fn(),
    ...overrides,
  }
  render(<ExerciseFilterChips {...props} />)
  return props
}

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

  it('starts collapsed below md and toggles the panel', () => {
    renderChips()
    const trigger = screen.getByRole('button', { name: 'Filter' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(trigger.getAttribute('aria-controls')!)!
    expect(panel).toHaveClass('hidden', 'md:block')
    expect(panel).not.toHaveClass('block')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(panel).toHaveClass('block')
    fireEvent.click(trigger)
    expect(panel).not.toHaveClass('block')
  })

  it('keeps the panel open after picking a chip', () => {
    renderChips()
    const trigger = screen.getByRole('button', { name: 'Filter' })
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Brust' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('counts active filters and offers a remove chip per filter, visible while collapsed', () => {
    const props = renderChips({ muskelgruppe: 'chest', equipment: 'barbell' })
    expect(screen.getByRole('button', { name: 'Filter (2)' })).toHaveClass('md:hidden')
    const entferneBrust = screen.getByRole('button', { name: 'Filter Brust entfernen' })
    expect(entferneBrust.closest('.hidden')).toBeNull()
    fireEvent.click(entferneBrust)
    expect(props.onMuskelgruppeChange).toHaveBeenCalledWith(null)
    expect(props.onEquipmentChange).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Filter Langhantel entfernen' }))
    expect(props.onEquipmentChange).toHaveBeenCalledWith(null)
  })

  it('renders only the row that has values', () => {
    renderChips({ muskelgruppen: [] })
    expect(screen.queryByRole('button', { name: 'Alle' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Alle Geräte' })).toBeInTheDocument()
  })

  it('renders nothing without any values', () => {
    const { container } = render(
      <ExerciseFilterChips
        muskelgruppen={[]}
        muskelgruppe={null}
        onMuskelgruppeChange={vi.fn()}
        equipmentWerte={[]}
        equipment={null}
        onEquipmentChange={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
