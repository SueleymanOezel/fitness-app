import { describe, expect, it, vi } from 'vitest'
import { useHomeAnalysis } from './use-home-analysis'

const mockTraining = vi.fn()
vi.mock('./use-training-analysis', () => ({ useTrainingAnalysis: (...args: unknown[]) => mockTraining(...args) }))
const mockNutrition = vi.fn()
vi.mock('./use-nutrition-analysis', () => ({ useNutritionAnalysis: (...args: unknown[]) => mockNutrition(...args) }))
const mockBody = vi.fn()
vi.mock('./use-body-analysis', () => ({ useBodyAnalysis: (...args: unknown[]) => mockBody(...args) }))

function stub(overrides: Record<string, unknown> = {}) {
  return { loading: false, error: false, ...overrides }
}

describe('useHomeAnalysis', () => {
  it('composes sessions, entries and rows from the three area hooks', () => {
    mockTraining.mockReturnValue(stub({ sessions: ['s1'], sets: [] }))
    mockNutrition.mockReturnValue(stub({ entries: ['e1'], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: ['r1'], kalorien: [], fotos: [] }))

    const result = useHomeAnalysis('u1', 90)

    expect(result).toEqual({ sessions: ['s1'], entries: ['e1'], rows: ['r1'], loading: false, error: false })
    expect(mockTraining).toHaveBeenCalledWith('u1', 90)
    expect(mockNutrition).toHaveBeenCalledWith('u1', 90)
    expect(mockBody).toHaveBeenCalledWith('u1', 90)
  })

  it('is loading while any of the three sources is loading', () => {
    mockTraining.mockReturnValue(stub({ sessions: [], sets: [], loading: true }))
    mockNutrition.mockReturnValue(stub({ entries: [], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: [], kalorien: [], fotos: [] }))

    expect(useHomeAnalysis('u1', 90).loading).toBe(true)
  })

  it('is an error if any of the three sources failed', () => {
    mockTraining.mockReturnValue(stub({ sessions: [], sets: [] }))
    mockNutrition.mockReturnValue(stub({ entries: [], sessions: [] }))
    mockBody.mockReturnValue(stub({ rows: [], kalorien: [], fotos: [], error: true }))

    expect(useHomeAnalysis('u1', 90).error).toBe(true)
  })
})
