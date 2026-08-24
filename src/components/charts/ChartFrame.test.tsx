import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ChartFrame from './ChartFrame'

describe('ChartFrame', () => {
  it('shows the chart when there is data', () => {
    render(
      <ChartFrame titel="Trainingsfrequenz" leer={false}>
        <div data-testid="inhalt" />
      </ChartFrame>,
    )
    expect(screen.getByRole('heading', { name: 'Trainingsfrequenz' })).toBeInTheDocument()
    expect(screen.getByTestId('inhalt')).toBeInTheDocument()
  })

  it('writes a sentence instead of drawing empty axes', () => {
    // An empty coordinate system looks like a failure. A sentence says which it
    // is: nothing recorded yet.
    render(
      <ChartFrame titel="Trainingsfrequenz" leer>
        <div data-testid="inhalt" />
      </ChartFrame>,
    )
    expect(screen.getByText('Noch nicht genug Daten für diesen Graphen.')).toBeInTheDocument()
    expect(screen.queryByTestId('inhalt')).not.toBeInTheDocument()
  })

  it('shows the picker even when empty', () => {
    // Un-pinning a chart that has no data yet must stay possible.
    render(
      <ChartFrame titel="Trainingsfrequenz" leer picker={<button type="button">Haken</button>}>
        <div />
      </ChartFrame>,
    )
    expect(screen.getByRole('button', { name: 'Haken' })).toBeInTheDocument()
  })
})
