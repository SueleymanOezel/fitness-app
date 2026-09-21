import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import MuscleFocusChart from './MuscleFocusChart'
import { ALLE_ZONEN } from '../../lib/muscle-zones'

const satz = (workoutSessionId: string, muskelgruppen: string[]) => ({
  id: `${workoutSessionId}-${muskelgruppen.join('-')}`,
  workout_session_id: workoutSessionId,
  exercise_id: 'e1',
  exercise_name: 'Uebung',
  muskelgruppen,
  satz_nummer: 1,
  gewicht: 80,
  wiederholungen: 10,
  ist_aufwaermsatz: false,
})

describe('MuscleFocusChart', () => {
  it('states the empty case when nothing was trained in the period', () => {
    render(<MuscleFocusChart sets={[]} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })

  it('renders all ten zones exactly once', () => {
    const { container } = render(<MuscleFocusChart sets={[satz('s1', ['chest'])]} />)
    for (const zone of ALLE_ZONEN) {
      expect(container.querySelectorAll(`[data-zone="${zone}"]`)).toHaveLength(1)
    }
  })

  it('colors the most-trained zone at full opacity', () => {
    const { container } = render(
      <MuscleFocusChart sets={[satz('s1', ['chest']), satz('s2', ['chest'])]} />,
    )
    const brust = container.querySelector('[data-zone="brust"]')
    expect(brust).toHaveAttribute('fill', 'var(--color-accent-text)')
    expect(brust).toHaveAttribute('fill-opacity', '1')
  })

  it('gives a less-trained zone a lower, but still visible, opacity relative to the max', () => {
    const { container } = render(
      <MuscleFocusChart
        sets={[satz('s1', ['chest']), satz('s2', ['triceps']), satz('s3', ['triceps'])]}
      />,
    )
    // brust: 1 Session, trizeps (Max): 2 Sessions -> 0.15 + 0.85 * (1/2)
    const brust = container.querySelector('[data-zone="brust"]')
    expect(Number(brust?.getAttribute('fill-opacity'))).toBeCloseTo(0.575, 5)
  })

  it('keeps a zone with zero hits at the neutral untrained color', () => {
    const { container } = render(<MuscleFocusChart sets={[satz('s1', ['chest'])]} />)
    const bauch = container.querySelector('[data-zone="bauch"]')
    expect(bauch).toHaveAttribute('fill', 'var(--color-surface-raised)')
    expect(bauch).toHaveAttribute('fill-opacity', '1')
  })
})
