import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachPressFeedback } from './press-feedback'
import { loadGsap } from './gsap-loader'

const gsap = {
  to: vi.fn(),
  killTweensOf: vi.fn(),
  set: vi.fn(),
}
vi.mock('./gsap-loader', () => ({ loadGsap: vi.fn(() => Promise.resolve(gsap)) }))

function stubReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

const flush = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.mocked(loadGsap).mockImplementation(() => Promise.resolve(gsap as never))
})

describe('attachPressFeedback', () => {
  it('scales down on pointerdown and springs back on pointerup', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 0.96 }))

    el.dispatchEvent(new Event('pointerup'))
    await flush()
    expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 1 }))
  })

  it('returns to scale 1 on pointerleave and pointercancel too', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    for (const type of ['pointerleave', 'pointercancel']) {
      el.dispatchEvent(new Event('pointerdown'))
      el.dispatchEvent(new Event(type))
      await flush()
      expect(gsap.to).toHaveBeenLastCalledWith(el, expect.objectContaining({ scale: 1 }))
    }
  })

  it('never ends scaled down when pointerup arrives before gsap has loaded', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.dispatchEvent(new Event('pointerup'))
    await flush()

    const scales = gsap.to.mock.calls.map(([, vars]) => (vars as { scale: number }).scale)
    expect(scales).toEqual([0.96, 1])
  })

  it('does nothing under reduced motion', async () => {
    stubReducedMotion(true)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()

    expect(loadGsap).not.toHaveBeenCalled()
    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('stays silent when gsap fails to load', async () => {
    stubReducedMotion(false)
    vi.mocked(loadGsap).mockRejectedValue(new Error('chunk failed'))
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.dispatchEvent(new Event('pointerup'))
    await flush()

    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('removes its listeners and resets the element on cleanup', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    const detach = attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    detach()
    await flush()

    expect(gsap.killTweensOf).toHaveBeenCalledWith(el)
    expect(gsap.set).toHaveBeenCalledWith(el, { clearProps: 'scale' })

    gsap.to.mockClear()
    el.dispatchEvent(new Event('pointerdown'))
    await flush()
    expect(gsap.to).not.toHaveBeenCalled()
  })
})
