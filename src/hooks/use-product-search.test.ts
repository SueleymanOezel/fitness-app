import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

function builder(result: { data: unknown; error?: unknown }) {
  const b: Record<string, unknown> = {
    select: vi.fn(() => b),
    eq: vi.fn(() => b),
    not: vi.fn(() => b),
    ilike: vi.fn(() => b),
    or: vi.fn(() => b),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    then: (resolve: (value: typeof result) => unknown) => resolve(result),
  }
  return b
}

const mockFrom = vi.fn()
vi.mock('../lib/supabase', () => ({ supabase: { from: (table: string) => mockFrom(table) } }))

afterEach(() => {
  vi.useRealTimers()
  mockFrom.mockReset()
})

const p = (id: string, name: string) => ({ id, name, kalorien: 100 })

describe('useZuletztGegessen', () => {
  it('lists each product once, newest first, with the amount of its latest entry', async () => {
    mockFrom.mockReturnValue(
      builder({
        data: [
          { menge: 250, zeitpunkt: '2026-10-18T08:00:00Z', products: p('p2', 'Skyr') },
          { menge: 80, zeitpunkt: '2026-10-18T07:00:00Z', products: p('p1', 'Hafer') },
          { menge: 150, zeitpunkt: '2026-10-17T08:00:00Z', products: p('p2', 'Skyr') },
          { menge: 50, zeitpunkt: '2026-10-16T08:00:00Z', products: null },
        ],
      }),
    )

    const { useZuletztGegessen } = await import('./use-product-search')
    const { result } = renderHook(() => useZuletztGegessen('u1'))

    await waitFor(() => expect(result.current).toHaveLength(2))
    expect(result.current.map((e) => [e.product.id, e.letzteMenge])).toEqual([
      ['p2', 250],
      ['p1', 80],
    ])
  })

  it('does not query without a user', async () => {
    const { useZuletztGegessen } = await import('./use-product-search')
    renderHook(() => useZuletztGegessen(undefined))
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('useProduktSuche', () => {
  it('searches own and barcode products by name after a short pause', async () => {
    const b = builder({ data: [p('p9', 'Skyr Vanille')] })
    mockFrom.mockReturnValue(b)

    const { useProduktSuche } = await import('./use-product-search')
    const { result } = renderHook(() => useProduktSuche('u1', 'skyr'))

    expect(result.current.laedt).toBe(true)
    await waitFor(() => expect(result.current.produkte).toEqual([p('p9', 'Skyr Vanille')]))
    expect(b.ilike).toHaveBeenCalledWith('name', '%skyr%')
    // Other users' private, barcode-less products are not a catalogue.
    expect(b.or).toHaveBeenCalledWith('created_by.eq.u1,barcode.not.is.null')
  })

  it('strips characters that would change the filter', async () => {
    const b = builder({ data: [] })
    mockFrom.mockReturnValue(b)

    const { useProduktSuche } = await import('./use-product-search')
    renderHook(() => useProduktSuche('u1', 'a,b)*%'))

    await waitFor(() => expect(b.ilike).toHaveBeenCalled())
    expect(b.ilike).toHaveBeenCalledWith('name', '%a b%')
  })

  it('does not search for fewer than two characters', async () => {
    const { useProduktSuche } = await import('./use-product-search')
    const { result } = renderHook(() => useProduktSuche('u1', 's'))

    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(mockFrom).not.toHaveBeenCalled()
    expect(result.current).toEqual({ produkte: [], laedt: false })
  })
})
