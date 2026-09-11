import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import TagMuskelSilhouette from './TagMuskelSilhouette'
import { ALLE_ZONEN, type MuskelZone, type ZonenStatus } from '../lib/muscle-zones'

afterEach(() => cleanup())

function leereZonen(overrides: Partial<Record<MuskelZone, ZonenStatus>> = {}) {
  const zonen = Object.fromEntries(ALLE_ZONEN.map((zone) => [zone, null])) as Record<MuskelZone, ZonenStatus>
  return { ...zonen, ...overrides }
}

describe('TagMuskelSilhouette', () => {
  it('renders every zone as untrained when nothing was trained', () => {
    const { container } = render(<TagMuskelSilhouette zonen={leereZonen()} />)
    for (const zone of ALLE_ZONEN) {
      expect(container.querySelector(`[data-zone="${zone}"]`)).toHaveAttribute('data-level', 'untrained')
    }
  })

  it('marks a primary-trained zone in the rendered markup', () => {
    const { container } = render(<TagMuskelSilhouette zonen={leereZonen({ brust: 'primary' })} />)
    expect(container.querySelector('[data-zone="brust"]')).toHaveAttribute('data-level', 'primary')
  })

  it('marks a secondary-trained zone in the rendered markup', () => {
    const { container } = render(<TagMuskelSilhouette zonen={leereZonen({ trizeps: 'secondary' })} />)
    expect(container.querySelector('[data-zone="trizeps"]')).toHaveAttribute('data-level', 'secondary')
  })

  it('renders all ten zones exactly once', () => {
    const { container } = render(<TagMuskelSilhouette zonen={leereZonen()} />)
    for (const zone of ALLE_ZONEN) {
      expect(container.querySelectorAll(`[data-zone="${zone}"]`)).toHaveLength(1)
    }
  })
})
