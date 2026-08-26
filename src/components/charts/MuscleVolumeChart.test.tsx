import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MuscleVolumeChart from './MuscleVolumeChart'

const satz = (muskelgruppen: string[], gewicht: number) => ({
  id: `${muskelgruppen.join('-')}-${gewicht}`,
  workout_session_id: 's1',
  exercise_id: 'e1',
  exercise_name: 'Bankdruecken',
  muskelgruppen,
  satz_nummer: 1,
  gewicht,
  wiederholungen: 10,
  ist_aufwaermsatz: false,
})

describe('MuscleVolumeChart', () => {
  it('draws one bar per muscle group', () => {
    const { container } = render(
      <MuscleVolumeChart sets={[satz(['brust'], 80), satz(['ruecken'], 60)]} />,
    )
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(2)
  })

  it('states the empty case without any assignable set', () => {
    render(<MuscleVolumeChart sets={[satz([], 80)]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
