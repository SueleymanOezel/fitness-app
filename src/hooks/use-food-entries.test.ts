import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
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
