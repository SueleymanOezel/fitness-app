import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function createQueryBuilder(result: { data: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
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

describe('list columns', () => {
  it('does not load the long instructions with the list', async () => {
    const builder = createQueryBuilder({ data: [exercise] })
    mockFrom.mockReturnValue(builder)

    const { useExercises } = await import('./use-exercises')
    const { result } = renderHook(() => useExercises('u1'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const columns = (builder.select as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(columns).not.toContain('anleitung')
    expect(columns).not.toBe('*')
    expect(columns).toContain('name_de')
  })
})

describe('useExerciseInstructions', () => {
  it('reads the instructions of one exercise, German first', async () => {
    const builder = createQueryBuilder({ data: { anleitung: ['A'], anleitung_de: ['Schritt A'] } })
    mockFrom.mockReturnValue(builder)

    const { useExerciseInstructions } = await import('./use-exercises')
    const { result } = renderHook(() => useExerciseInstructions('ex1'))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.anleitung).toEqual(['Schritt A'])
    expect(builder.eq).toHaveBeenCalledWith('id', 'ex1')
  })

  it('falls back to the English steps when there is no translation', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: { anleitung: ['A'], anleitung_de: null } }))

    const { useExerciseInstructions } = await import('./use-exercises')
    const { result } = renderHook(() => useExerciseInstructions('ex1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.anleitung).toEqual(['A'])
  })

  it('reports an error instead of an empty instruction list', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: null, error: { message: 'boom' } }))

    const { useExerciseInstructions } = await import('./use-exercises')
    const { result } = renderHook(() => useExerciseInstructions('ex1'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(true)
  })

  it('does not show the previous exercise while the next one loads', async () => {
    mockFrom.mockReturnValue(createQueryBuilder({ data: { anleitung: ['A'], anleitung_de: null } }))

    const { useExerciseInstructions } = await import('./use-exercises')
    const { result, rerender } = renderHook(({ id }) => useExerciseInstructions(id), { initialProps: { id: 'ex1' } })
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockFrom.mockReturnValue(createQueryBuilder({ data: { anleitung: ['B'], anleitung_de: null } }))
    rerender({ id: 'ex2' })
    expect(result.current.loading).toBe(true)
    expect(result.current.anleitung).toEqual([])
    await waitFor(() => expect(result.current.anleitung).toEqual(['B']))
  })
})
