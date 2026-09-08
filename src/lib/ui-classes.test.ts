import { describe, expect, it } from 'vitest'
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  inputClass,
  interactiveClass,
} from './ui-classes'

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

  it('gives the primary button on-bright text instead of the near-white default, for AA contrast on accent', () => {
    expect(buttonPrimaryClass).toContain('text-on-bright')
    expect(buttonPrimaryClass).not.toContain('text-text ')
  })

  it('gives both buttons hover, press and focus-visible feedback', () => {
    for (const cls of [buttonPrimaryClass, buttonSecondaryClass]) {
      expect(cls).toContain('transition')
      expect(cls).toContain('motion-reduce:transition-none')
      expect(cls).toContain('hover:brightness-110')
      expect(cls).toContain('motion-safe:active:scale-[0.97]')
      expect(cls).toContain('focus-visible:ring-2')
      expect(cls).toContain('focus-visible:ring-accent')
      expect(cls).toContain('focus-visible:ring-offset-2')
      expect(cls).toContain('focus-visible:ring-offset-bg')
    }
  })

  it('gives text inputs a raised look distinct from the page background, with focus feedback', () => {
    expect(inputClass).toContain('bg-surface')
    expect(inputClass).toContain('w-full')
    expect(inputClass).toContain('rounded-2xl')
    expect(inputClass).toContain('focus-visible:ring-2')
    expect(inputClass).toContain('focus-visible:ring-accent')
  })

  it('exports the shared interactive-state classes for other components to reuse', () => {
    expect(interactiveClass).toContain('transition')
    expect(interactiveClass).toContain('motion-safe:active:scale-[0.97]')
    expect(interactiveClass).not.toContain('ring-offset')
  })
})
