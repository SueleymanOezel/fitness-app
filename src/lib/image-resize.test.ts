import { describe, expect, it } from 'vitest'
import { fitWithin } from './image-resize'

describe('fitWithin', () => {
  it('leaves an image that already fits untouched', () => {
    // No upscaling: a small photo must not be blown up to the maximum.
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('scales a landscape image down by its long edge', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
  })

  it('scales a portrait image down by its long edge', () => {
    // Phone photos are portrait; the height is what has to be capped.
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 })
  })

  it('returns whole pixels', () => {
    const { width, height } = fitWithin(4032, 3024, 1600)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
  })

  it('never returns a zero edge', () => {
    // A canvas of width 0 throws; an extreme aspect ratio must still produce 1px.
    expect(fitWithin(10000, 3, 1600).height).toBeGreaterThanOrEqual(1)
  })
})
