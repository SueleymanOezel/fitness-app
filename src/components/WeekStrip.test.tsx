import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import WeekStrip from './WeekStrip'
import { wochenStreifen } from '../lib/streak'

afterEach(cleanup)

describe('WeekStrip', () => {
  it('zeigt sieben Tage mit Status für Screenreader', () => {
    render(<WeekStrip tage={wochenStreifen(['2026-10-12', '2026-10-14'], '2026-10-14')} />)
    const liste = screen.getByRole('list', { name: 'Trainingstage diese Woche' })
    const eintraege = Array.from(liste.querySelectorAll('li'))
    expect(eintraege).toHaveLength(7)
    expect(eintraege[0]).toHaveAttribute('data-status', 'trainiert')
    expect(eintraege[1]).toHaveAttribute('data-status', 'offen')
    expect(eintraege[2]).toHaveTextContent('trainiert, heute')
    expect(eintraege[3]).toHaveTextContent('kein Training')
  })

  it('says once what the colours mean', () => {
    render(<WeekStrip tage={wochenStreifen([], '2026-10-14')} />)
    expect(screen.getByText('trainiert', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('heute', { selector: 'span' })).toBeInTheDocument()
  })

  // Training data is mint; the lilac belongs to actions (re-audit 23.10.2026).
  it('marks a trained day in training mint, not in the action lilac', () => {
    render(<WeekStrip tage={wochenStreifen(['2026-10-12'], '2026-10-14')} />)
    const balken = screen.getByRole('list', { name: 'Trainingstage diese Woche' }).querySelector('li span.h-7')
    expect(balken).toHaveClass('bg-chart-mint')
    expect(balken).not.toHaveClass('bg-accent')
  })
})
