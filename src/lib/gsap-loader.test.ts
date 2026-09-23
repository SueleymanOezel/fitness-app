import { describe, expect, it, vi } from 'vitest'

vi.mock('gsap', () => ({ gsap: { to: vi.fn(), fromTo: vi.fn() } }))

import { loadGsap } from './gsap-loader'

describe('loadGsap', () => {
  it('resolves the gsap instance via a dynamic import', async () => {
    const gsap = await loadGsap()
    expect(gsap.to).toBeInstanceOf(Function)
    expect(gsap.fromTo).toBeInstanceOf(Function)
  })
})
