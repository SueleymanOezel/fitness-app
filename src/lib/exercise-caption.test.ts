import { describe, expect, it } from 'vitest'
import { exerciseCaption, revealDelay } from './exercise-caption'

describe('exerciseCaption', () => {
  it('joins equipment and first primary muscle group', () => {
    expect(exerciseCaption({ equipment: 'barbell', muskelgruppen_primaer: ['chest', 'triceps'] })).toBe('Langhantel · Brust')
  })
  it('shows only what is there', () => {
    expect(exerciseCaption({ equipment: 'barbell', muskelgruppen_primaer: null })).toBe('Langhantel')
    expect(exerciseCaption({ equipment: null, muskelgruppen_primaer: ['chest'] })).toBe('Brust')
  })
  it('is empty when nothing is known', () => {
    expect(exerciseCaption({ equipment: null, muskelgruppen_primaer: [] })).toBe('')
  })
})

describe('revealDelay', () => {
  it('staggers by 30ms and caps at index 12', () => {
    expect(revealDelay(0)).toBe('0ms')
    expect(revealDelay(3)).toBe('90ms')
    expect(revealDelay(500)).toBe('360ms')
  })
})
