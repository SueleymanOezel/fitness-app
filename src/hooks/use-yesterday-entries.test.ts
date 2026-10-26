import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { gesternRange, useGesternEintraege } from './use-yesterday-entries'

const antworten: Record<string, { data: unknown; error: unknown }> = {}
vi.mock('../lib/supabase', () => {
  const builder = (userId: { wert: string }) => {
    const b: Record<string, unknown> = {}
    for (const name of ['select', 'gte', 'lt', 'not', 'order']) b[name] = () => b
    b.eq = (_spalte: string, wert: string) => {
      userId.wert = wert
      return b
    }
    b.then = (resolve: (value: unknown) => unknown) => Promise.resolve(antworten[userId.wert]).then(resolve)
    return b
  }
  return { supabase: { from: () => builder({ wert: '' }) } }
})

describe('gesternRange', () => {
  it('is the whole local day before, also across a month end', () => {
    const { start, end } = gesternRange(new Date(2026, 10, 1, 8, 30))
    expect(new Date(start)).toEqual(new Date(2026, 9, 31))
    expect(new Date(end)).toEqual(new Date(2026, 10, 1))
  })
})

describe('useGesternEintraege', () => {
  it("never shows the previous account's meals after a user change, even if the new read fails", async () => {
    antworten.a = { data: [{ product_id: 'p1', menge: 80, mahlzeit: 1 }], error: null }
    antworten.b = { data: null, error: { message: 'x' } }
    const { result, rerender } = renderHook(({ userId }) => useGesternEintraege(userId), { initialProps: { userId: 'a' } })
    await waitFor(() => expect(result.current.eintraege).toHaveLength(1))

    rerender({ userId: 'b' })
    expect(result.current.eintraege).toEqual([])
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(result.current.eintraege).toEqual([])
  })
})
