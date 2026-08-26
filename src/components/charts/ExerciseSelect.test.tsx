import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import ExerciseSelect from './ExerciseSelect'

const optionen = [
  { exercise_id: 'e1', name: 'Bankdruecken' },
  { exercise_id: 'e2', name: 'Kniebeuge' },
]

describe('ExerciseSelect', () => {
  it('shows the chosen exercise and reports a change', () => {
    const onChange = vi.fn()
    render(<ExerciseSelect optionen={optionen} wert="e1" onChange={onChange} />)

    const feld = screen.getByLabelText('Übung')
    expect(feld).toHaveValue('e1')
    fireEvent.change(feld, { target: { value: 'e2' } })
    expect(onChange).toHaveBeenCalledWith('e2')
  })

  it('renders nothing for a single exercise', () => {
    // Eine Auswahl mit genau einem Eintrag ist kein Bedienelement, sondern Zierrat.
    const { container } = render(
      <ExerciseSelect optionen={[optionen[0]]} wert="e1" onChange={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
