import { describe, expect, it } from 'vitest'
import { tagesLabel } from './tages-label'

describe('tagesLabel', () => {
  it('formats a two-digit day and month', () => {
    expect(tagesLabel('2026-08-24')).toBe('24.08.')
  })

  it('keeps a one-digit day as it appears in the ISO string', () => {
    expect(tagesLabel('2026-08-05')).toBe('05.08.')
  })

  it('formats a two-digit day with a one-digit-looking month', () => {
    expect(tagesLabel('2026-01-31')).toBe('31.01.')
  })
})
