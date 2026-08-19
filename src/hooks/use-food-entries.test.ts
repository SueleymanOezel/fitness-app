import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const entry = {
  id: 'e1',
  menge: 150,
  zeitpunkt: '2026-08-18T12:00:00Z',
  products: { name: 'Testprodukt', kalorien: 200, eiweiss: 5, fett: 2, kohlenhydrate: 30 },
}

describe('useFoodEntries', () => {
  it('loads today\'s entries for the given user id', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: [entry] }))

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entries).toEqual([entry])
  })

  it('inserts a new entry via addEntry and reloads', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.addEntry('p1', 150)

    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'u1', product_id: 'p1', menge: 150 })
  })

  it('deletes an entry via deleteEntry', async () => {
    const builder = createQueryBuilder({ data: [] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.deleteEntry('e1')

    expect(builder.delete).toHaveBeenCalled()
    expect(builder.eq).toHaveBeenCalledWith('id', 'e1')
  })
})

// Minimal ambient type for the Node `process` global this test file relies
// on (to pin the timezone). The project's browser-only tsconfig has no
// @types/node, so this is scoped locally instead of adding that dependency.
declare const process: { env: Record<string, string | undefined> }

describe('todayRange', () => {
  const originalTz = process.env.TZ

  beforeEach(() => {
    // Pin a non-UTC timezone (CEST, matching this app's German-speaking
    // users) so the test reproduces the local-midnight/UTC-day-boundary
    // mismatch regardless of the host machine's own timezone.
    process.env.TZ = 'Europe/Berlin'
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.TZ = originalTz
  })

  it('uses the local calendar day, not the UTC calendar day, for the day boundaries', async () => {
    // Local time 2026-08-19T00:30:00 CEST (UTC+2) is 2026-08-18T22:30:00Z —
    // i.e. the UTC calendar date is still the 18th while the local calendar
    // date is already the 19th. A UTC-based implementation
    // (`new Date().toISOString().slice(0, 10)`) would compute "today" as the
    // 18th here and shift the whole query window a day early.
    vi.setSystemTime(new Date(2026, 7, 19, 0, 30, 0))

    const { todayRange } = await import('./use-food-entries')
    const { start, end } = todayRange()

    expect(start).toBe('2026-08-18T22:00:00.000Z')
    // Half-open upper bound (local midnight of the next day, queried with `.lt`),
    // so an entry at 23:59:59.4 local time still counts towards today.
    expect(end).toBe('2026-08-19T22:00:00.000Z')
  })
})
