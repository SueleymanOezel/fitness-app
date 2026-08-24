import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { fromLocalInputValue, localDay, toLocalInputValue } from './local-time'

// Minimal ambient type for the Node `process` global this test file relies on
// (to pin the timezone). The project's browser-only tsconfig has no @types/node.
declare const process: { env: Record<string, string | undefined> }

describe('local time conversion', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    // Pin a non-UTC zone so a UTC-based implementation cannot pass by accident.
    process.env.TZ = 'Europe/Berlin'
  })

  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('shows a stored timestamp in local time', () => {
    // 06:30 UTC is 08:30 in Berlin summer time.
    expect(toLocalInputValue('2026-08-19T06:30:00.000Z')).toBe('2026-08-19T08:30')
  })

  it('stores a locally entered time as UTC', () => {
    expect(fromLocalInputValue('2026-08-19T08:30')).toBe('2026-08-19T06:30:00.000Z')
  })

  it('survives a round trip across the day boundary', () => {
    // 00:30 local on the 19th is still the 18th in UTC — the case that broke
    // todayRange() in Phase 2.
    const iso = fromLocalInputValue('2026-08-19T00:30')
    expect(iso).toBe('2026-08-18T22:30:00.000Z')
    expect(toLocalInputValue(iso as string)).toBe('2026-08-19T00:30')
  })

  it('returns null for an empty value instead of throwing', () => {
    expect(fromLocalInputValue('')).toBeNull()
  })

  it('returns null for a malformed value instead of throwing', () => {
    expect(fromLocalInputValue('not-a-date')).toBeNull()
    expect(fromLocalInputValue('2026-08-19T')).toBeNull()
  })
})

describe('localDay', () => {
  it('takes the local calendar day, not the UTC one', () => {
    // 23:50 local on the 24th is already the 25th in UTC for any positive
    // offset. An entry logged before bed belongs to that evening.
    const abends = new Date(2026, 7, 24, 23, 50).toISOString()
    expect(localDay(abends)).toBe('2026-08-24')
  })

  it('pads month and day', () => {
    expect(localDay(new Date(2026, 0, 5, 12, 0).toISOString())).toBe('2026-01-05')
  })
})
