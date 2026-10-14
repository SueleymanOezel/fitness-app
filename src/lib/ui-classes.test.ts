import { describe, expect, it } from 'vitest'
import {
  buttonDangerClass,
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  checkLabelClass,
  fieldLabelClass,
  inputClass,
  interactiveClass,
  linkClass,
  listClass,
  listRowClass,
  stickyActionClass,
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

  it('gives both buttons hover and focus-visible feedback (press scale is GSAP)', () => {
    for (const cls of [buttonPrimaryClass, buttonSecondaryClass]) {
      expect(cls).toContain('transition')
      expect(cls).toContain('motion-reduce:transition-none')
      expect(cls).toContain('hover:brightness-110')
      expect(cls).toContain('focus-visible:ring-2')
      expect(cls).toContain('focus-visible:ring-accent')
      expect(cls).toContain('focus-visible:ring-offset-2')
      expect(cls).toContain('focus-visible:ring-offset-bg')
    }
  })

  it('gives text inputs a raised look distinct from both the page and a card background, with focus feedback', () => {
    expect(inputClass).toContain('bg-surface-raised')
    expect(inputClass).toContain('w-full')
    expect(inputClass).toContain('m-0')
    expect(inputClass).toContain('rounded-2xl')
    expect(inputClass).toContain('focus-visible:ring-2')
    expect(inputClass).toContain('focus-visible:ring-accent')
  })

  it('keeps field text at 16px regular even inside a small label (no iOS focus zoom)', () => {
    expect(inputClass.split(' ')).toEqual(expect.arrayContaining(['text-base', 'font-normal']))
  })

  it('exports the shared interactive-state classes for other components to reuse', () => {
    expect(interactiveClass).toContain('transition')
    expect(interactiveClass).not.toContain('active:scale')
    expect(interactiveClass).not.toContain('ring-offset')
  })

  it('does not CSS-transition transform, which GSAP drives inline every frame', () => {
    for (const cls of [interactiveClass, buttonPrimaryClass, buttonSecondaryClass]) {
      expect(cls).not.toMatch(/(^|\s)transition(\s|$)/)
      expect(cls).not.toMatch(/transition-(all|transform)/)
      expect(cls).not.toMatch(/transition-\[[^\]]*(transform|scale|translate|rotate)/)
      expect(cls).toMatch(/transition-\[[^\]]*background-color/)
    }
  })

  it('keeps a bottom-anchored primary action above the floating nav', () => {
    expect(stickyActionClass).toContain('sticky')
    expect(stickyActionClass).toContain('bottom-[var(--nav-clearance)]')
  })

  it('raises every control off the card surface, so it stays visible inside a card', () => {
    for (const cls of [buttonSecondaryClass, buttonDangerClass, inputClass]) {
      expect(cls.split(' ')).toContain('bg-surface-raised')
      expect(cls.split(' ')).not.toContain('bg-surface')
    }
  })

  it('spaces blocks inside a card at 12px', () => {
    expect(cardClass.split(' ')).toContain('space-y-3')
  })

  it('stacks a field label above its field in the quiet label style', () => {
    expect(fieldLabelClass).toContain('flex-col')
    expect(fieldLabelClass).toContain('text-text-muted')
  })

  it('gives checkbox labels and text links a 44px tap height', () => {
    expect(checkLabelClass).toContain('min-h-11')
    expect(linkClass).toContain('min-h-11')
  })

  it('gives text links the accessible accent tint and a visible keyboard focus', () => {
    expect(linkClass).toContain('text-accent-text')
    expect(linkClass).toContain('focus-visible:ring-2')
  })

  it('separates list rows with a quiet divider and lays them out left-aligned', () => {
    expect(listClass).toContain('divide-y')
    expect(listRowClass).toContain('items-center')
    expect(listRowClass).not.toContain('justify-center')
  })
})
