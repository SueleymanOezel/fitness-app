import { describe, expect, it } from 'vitest'
import { nextTrainingDay } from './next-training-day'

const dayA = { id: 'a', reihenfolge: 1 }
const dayB = { id: 'b', reihenfolge: 2 }
const dayC = { id: 'c', reihenfolge: 3 }

describe('nextTrainingDay', () => {
  it('returns the first day when there is no previous session', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], null)).toEqual(dayA)
  })

  it('returns the day after the last completed one', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], 'a')).toEqual(dayB)
  })

  it('wraps around from the last day back to the first', () => {
    expect(nextTrainingDay([dayA, dayB, dayC], 'c')).toEqual(dayA)
  })

  it('falls back to the first day when the last completed day no longer exists', () => {
    expect(nextTrainingDay([dayA, dayB], 'deleted-day')).toEqual(dayA)
  })

  it('is independent of the order the days are passed in', () => {
    expect(nextTrainingDay([dayC, dayA, dayB], 'a')).toEqual(dayB)
  })

  it('returns null when the plan has no days', () => {
    expect(nextTrainingDay([], null)).toBeNull()
  })
})
