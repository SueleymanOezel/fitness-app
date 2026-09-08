import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomeChartList from './HomeChartList'
import { H1, H2, H3 } from '../../lib/analysis/registry'

describe('HomeChartList', () => {
  it('renders the requested charts by id, in the given order', async () => {
    render(
      <HomeChartList
        ids={[H2, H1]}
        sessions={[]}
        entries={[]}
        rows={[]}
        zeitraum={90}
      />,
    )
    expect(await screen.findByText('Wochen-Kurzform')).toBeInTheDocument()
    expect(await screen.findByText('Aktivitätsraster')).toBeInTheDocument()
  })

  it('renders nothing for an unknown id', () => {
    const { container } = render(<HomeChartList ids={['unbekannt']} sessions={[]} entries={[]} rows={[]} zeitraum={90} />)
    expect(container.querySelector('section')).toBeNull()
  })

  it('renders H3 by id too', async () => {
    render(<HomeChartList ids={[H3]} sessions={[]} entries={[]} rows={[]} zeitraum={90} />)
    expect(await screen.findByText('Trends')).toBeInTheDocument()
  })
})
