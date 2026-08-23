import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return builder
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({
  supabase: { from: (table: string) => mockFrom(table) },
}))

const exercise = {
  id: 'ex1',
  name: '3/4 Sit-Up',
  kategorie: 'strength',
  equipment: 'body only',
  muskelgruppen_primaer: ['abdominals'],
  muskelgruppen_sekundaer: [],
  bild_url: null,
  met_wert: 5,
  created_by: null,
}

describe('useExercises', () => {
  it('loads all exercises ordered by name', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.exercises).toEqual([exercise])
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true })
  })

  it('creates an own exercise and reloads', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await result.current.createExercise({ name: 'Eigene Übung', kategorie: 'strength', met_wert: 5 })

    expect(builder.insert).toHaveBeenCalledWith({
      created_by: 'u1',
      name: 'Eigene Übung',
      kategorie: 'strength',
      met_wert: 5,
    })
  })

  it('rejects instead of reporting success when creating an exercise fails', async () => {
    const builder = createQueryBuilder({ data: [], error: { message: 'boom' } })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    await expect(result.current.createExercise({ name: 'X', kategorie: 'strength', met_wert: 1 })).rejects.toThrow()
  })

  it('keeps paging until a short page arrives, so nothing is cut off at the row cap', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ ...exercise, id: `ex${index}` }))
    const pages = [firstPage, [exercise]]
    let call = 0
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: pages[call++] ?? [], error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.exercises).toHaveLength(501)
    expect(builder.range).toHaveBeenNthCalledWith(1, 0, 499)
    expect(builder.range).toHaveBeenNthCalledWith(2, 500, 999)
  })

  it('reports an error instead of serving a half-loaded library as complete', async () => {
    const firstPage = Array.from({ length: 500 }, (_, index) => ({ ...exercise, id: `ex${index}` }))
    const results = [
      { data: firstPage, error: null },
      { data: null, error: { message: 'boom' } },
    ]
    let call = 0
    const builder: Record<string, unknown> = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      order: vi.fn(() => builder),
      range: vi.fn(() => builder),
      then: (resolve: (value: unknown) => unknown) => resolve(results[call++] ?? { data: [], error: null }),
    }
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe(true)
    expect(result.current.exercises).toEqual([])
  })

  it('orders by id as well, so a page boundary cannot drop or repeat a row', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(builder.order).toHaveBeenCalledWith('id', { ascending: true })
  })
})
