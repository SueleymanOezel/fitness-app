import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ActivityGridChart from './ActivityGridChart'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 7, 25, 12, 0, 0))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ActivityGridChart', () => {
  it('renders one cell per day in the window, marking training days', () => {
    const sessions = [{ beendet_am: '2026-08-24T18:00:00Z' }]
    render(<ActivityGridChart sessions={sessions} zeitraum={30} />)
    const zellen = screen.getByTestId('aktivitaetsraster').querySelectorAll('[data-status]')
    // rangeStart(30, 2026-08-25) beginnt am 2026-07-26, bis heute (2026-08-25) sind das 31 Tage
    expect(zellen.length).toBe(31)
    const trainingszellen = [...zellen].filter((zelle) => zelle.getAttribute('data-status') === 'trainingstag')
    expect(trainingszellen).toHaveLength(1)
    expect(trainingszellen[0]).toHaveAttribute('title', '2026-08-24')
    expect(trainingszellen[0]).toHaveClass('bg-accent')
  })

  it('renders all-restday cells when there are no sessions in the range', () => {
    render(<ActivityGridChart sessions={[]} zeitraum={30} />)
    const raster = screen.getByTestId('aktivitaetsraster')
    // Even with no sessions, we show all 31 days as restdays, which is not "empty"
    const zellen = raster.querySelectorAll('[data-status]')
    expect(zellen.length).toBe(31)
    const restdayzellen = [...zellen].filter((zelle) => zelle.getAttribute('data-status') === 'restday')
    expect(restdayzellen).toHaveLength(31)
    expect(restdayzellen[0]).toHaveClass('bg-surface')
  })
})
