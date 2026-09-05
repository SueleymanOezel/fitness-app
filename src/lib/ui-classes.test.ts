import { describe, expect, it } from 'vitest'
import { buttonPrimaryClass, buttonSecondaryClass, cardClass } from './ui-classes'

describe('ui-classes', () => {
  it('gives every card the same rounded surface treatment', () => {
    expect(cardClass).toContain('bg-surface')
    expect(cardClass).toContain('rounded-3xl')
  })

  it('gives the primary button the accent background, full width and matching radius', () => {
    expect(buttonPrimaryClass).toContain('bg-accent')
    expect(buttonPrimaryClass).toContain('w-full')
    expect(buttonPrimaryClass).toContain('rounded-2xl')
    expect(buttonPrimaryClass).toContain('border-0')
    expect(buttonPrimaryClass).toContain('m-0')
  })

  it('keeps the secondary button visually distinct from the primary one', () => {
    expect(buttonSecondaryClass).not.toContain('bg-accent')
    expect(buttonSecondaryClass).not.toContain('w-full')
    expect(buttonSecondaryClass).toContain('rounded-2xl')
    expect(buttonSecondaryClass).toContain('border-0')
    expect(buttonSecondaryClass).toContain('m-0')
  })
})
