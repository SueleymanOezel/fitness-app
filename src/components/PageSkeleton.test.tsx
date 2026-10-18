import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import PageSkeleton, { ChartSkeleton } from './PageSkeleton'

afterEach(cleanup)

describe('PageSkeleton', () => {
  it('zeigt die Überschrift und meldet den Ladezustand als Status', () => {
    render(<PageSkeleton titel="Training" />)
    expect(screen.getByRole('heading', { name: 'Training' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })

  it('hält die Platzhalter vor Hilfstechnik verborgen', () => {
    const { container } = render(<PageSkeleton titel="Training" variante="liste" />)
    const blocks = container.querySelectorAll('[aria-hidden="true"]')
    expect(blocks.length).toBeGreaterThan(0)
  })

  it('pulsiert nur ohne reduzierte Bewegung', () => {
    const { container } = render(<PageSkeleton titel="Training" />)
    const block = container.querySelector('[aria-hidden="true"]')
    expect(block).toHaveClass('animate-pulse', 'motion-reduce:animate-none')
  })
})

describe('ChartSkeleton', () => {
  it('meldet den Ladezustand als Status', () => {
    render(<ChartSkeleton />)
    expect(screen.getByRole('status')).toHaveTextContent('Lädt…')
  })
})
