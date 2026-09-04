import { describe, expect, it, vi } from 'vitest'
import { PAGE_SIZE, seitenweiseLaden } from './paged-query'

describe('seitenweiseLaden', () => {
  it('keeps asking until a short page comes back', async () => {
    const erste = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: String(i) }))
    const seite = vi
      .fn()
      .mockResolvedValueOnce({ data: erste, error: null })
      .mockResolvedValueOnce({ data: [{ id: 'letzte' }], error: null })

    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)

    expect(ergebnis.failed).toBe(false)
    expect(ergebnis.rows).toHaveLength(PAGE_SIZE + 1)
    expect(seite).toHaveBeenNthCalledWith(1, 0, PAGE_SIZE - 1)
    expect(seite).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1)
  })

  it('stops after one page when it is not full', async () => {
    const seite = vi.fn().mockResolvedValue({ data: [{ id: 'a' }], error: null })
    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)
    expect(seite).toHaveBeenCalledTimes(1)
    expect(ergebnis.rows).toHaveLength(1)
  })

  it('reports a failed page instead of serving a partial result', async () => {
    // Sonst sieht ein halb geladener Zeitraum aus wie ein magerer Monat.
    const erste = Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: String(i) }))
    const seite = vi
      .fn()
      .mockResolvedValueOnce({ data: erste, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const ergebnis = await seitenweiseLaden<{ id: string }>(seite)

    expect(ergebnis.failed).toBe(true)
    expect(ergebnis.rows).toEqual([])
  })
})
