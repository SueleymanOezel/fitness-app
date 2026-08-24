import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import CaloriesPerDayChart from './CaloriesPerDayChart'

const eintrag = (tag: number, kalorien: number) => ({
  zeitpunkt: new Date(2026, 7, tag, 12, 0).toISOString(),
  menge: 100,
  mahlzeit: 1,
  products: { kalorien, eiweiss: 0, fett: 0, kohlenhydrate: 0 },
})

describe('CaloriesPerDayChart', () => {
  it('draws a point per logged day', () => {
    // Tick text is a Recharts layout heuristic and cannot carry this
    // assertion in jsdom (see the training frequency chart's test). The mark
    // count proves the computed series reached the chart instead.
    //
    // The [ML] count is NOT a general "one command per day": type="monotone"
    // emits `M…L…` only for exactly two points and switches to `M…C…C…` from
    // three points on, where the same count would read 1. It equals the number
    // of days only because these fixtures have exactly two.
    const { container } = render(
      <CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={1672} />,
    )
    const pfad = container.querySelector('.recharts-line-curve')
    expect(pfad).not.toBeNull()
    const punkte = pfad!.getAttribute('d')!.match(/[ML]/g)
    expect(punkte).toHaveLength(2)
  })

  it('shows the goal as a reference line', () => {
    render(<CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={1672} />)
    expect(screen.getByText('Ziel 1672 kcal')).toBeInTheDocument()
  })

  it('still draws the goal line when the goal is above every logged day', () => {
    // The case this chart exists for: someone cutting logs well under the
    // goal. Recharts defaults ReferenceLine to ifOverflow="discard" and feeds
    // the y-axis domain only from lines that carry extendDomain, so without
    // that prop the line and its label vanish silently — exactly for the users
    // who need to see the gap.
    render(
      <CaloriesPerDayChart entries={[eintrag(23, 1400), eintrag(24, 1600)]} ziel={2000} />,
    )
    expect(screen.getByText('Ziel 2000 kcal')).toBeInTheDocument()
  })

  it('draws without a reference line when the profile has no goal', () => {
    // An incomplete profile yields no goal. The intake is still worth seeing.
    const { container } = render(
      <CaloriesPerDayChart entries={[eintrag(23, 1800), eintrag(24, 2100)]} ziel={null} />,
    )
    expect(screen.queryByText(/^Ziel /)).not.toBeInTheDocument()
    const pfad = container.querySelector('.recharts-line-curve')
    expect(pfad).not.toBeNull()
    const punkte = pfad!.getAttribute('d')!.match(/[ML]/g)
    expect(punkte).toHaveLength(2)
  })

  it('says so with fewer than two logged days', () => {
    render(<CaloriesPerDayChart entries={[eintrag(24, 2100)]} ziel={1672} />)
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
  })
})
