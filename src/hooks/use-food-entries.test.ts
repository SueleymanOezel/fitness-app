import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

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

  it('ignores a stale reload that answers after a newer one', async () => {
    // Two quick deletes: the first reload still carries the entry and resolves
    // last. Without the guard it would put the deleted entry back on screen.
    const slowBuilder = createQueryBuilder({ data: [entry] })
    const fastBuilder = createQueryBuilder({ data: [] })
    let releaseSlow: () => void = () => {}
    slowBuilder.order = vi.fn(() => ({
      then: (resolve: (value: { data: unknown }) => unknown) =>
        new Promise<void>((r) => {
          releaseSlow = r
        }).then(() => resolve({ data: [entry] })),
    }))

    mockFrom.mockReturnValueOnce(slowBuilder).mockReturnValue(fastBuilder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))

    await act(async () => {
      await result.current.deleteEntry('e1')
    })
    expect(result.current.entries).toEqual([])

    await act(async () => {
      releaseSlow()
    })
    expect(result.current.entries).toEqual([])
  })

  it('rejects instead of reporting success when a write fails', async () => {
    const builder = createQueryBuilder({ data: [], error: { message: 'rejected' } })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.updateEntry('e1', { menge: 200 })).rejects.toThrow()
  })

  it('updates several fields of an entry in one write', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.updateEntry('e1', {
      menge: 200,
      zeitpunkt: '2026-08-19T06:30:00.000Z',
      product_id: 'p2',
    })

    expect(builder.update).toHaveBeenCalledWith({
      menge: 200,
      zeitpunkt: '2026-08-19T06:30:00.000Z',
      product_id: 'p2',
    })
    expect(builder.eq).toHaveBeenCalledWith('id', 'e1')
  })

  it('loads the fields the edit form needs', async () => {
    const builder = createQueryBuilder({ data: [entry] })
    mockFrom.mockReturnValue(builder)

    const { useFoodEntries } = await import('./use-food-entries')
    const { result } = renderHook(() => useFoodEntries('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // product_id for remapping, created_by to decide update-vs-copy.
    const select = builder.select as ReturnType<typeof vi.fn>
    const selected = select.mock.calls[0][0] as string
    expect(selected).toContain('product_id')
    expect(selected).toContain('created_by')
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
