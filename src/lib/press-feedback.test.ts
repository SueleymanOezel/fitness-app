import { afterEach, describe, expect, it, vi } from 'vitest'
import { attachPressFeedback } from './press-feedback'
import { loadGsap } from './gsap-loader'

// Minimal ambient type for the Node `process` global, used to observe
// unhandled promise rejections (same pattern as the other test files here).
declare const process: {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void
}

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

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

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
    // Only the FIRST load is held back. Without the shared chain, the release
    // would call loadGsap() on its own, resolve first, and run before the press.
    const first = deferred<typeof gsap>()
    vi.mocked(loadGsap).mockImplementationOnce(() => first.promise as never)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.dispatchEvent(new Event('pointerup'))
    // Let the press reach its (still pending) loadGsap call before resolving it.
    await flush()
    first.resolve(gsap)
    await flush()

    const scales = gsap.to.mock.calls.map(([, vars]) => (vars as { scale: number }).scale)
    expect(scales).toEqual([0.96, 1])
  })

  it('ignores presses on disabled and aria-disabled elements without loading gsap', async () => {
    stubReducedMotion(false)
    const disabled = document.createElement('button')
    disabled.disabled = true
    const ariaDisabled = document.createElement('a')
    ariaDisabled.setAttribute('aria-disabled', 'true')
    attachPressFeedback(disabled)
    attachPressFeedback(ariaDisabled)

    for (const el of [disabled, ariaDisabled]) {
      el.dispatchEvent(new Event('pointerdown'))
      el.dispatchEvent(new Event('pointerup'))
    }
    await flush()

    expect(loadGsap).not.toHaveBeenCalled()
    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('still springs back when the element becomes disabled mid-press', async () => {
    stubReducedMotion(false)
    const el = document.createElement('button')
    attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    el.disabled = true
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

  it('does not animate when detached while gsap is still loading', async () => {
    stubReducedMotion(false)
    const first = deferred<typeof gsap>()
    vi.mocked(loadGsap).mockImplementationOnce(() => first.promise as never)
    const el = document.createElement('button')
    const detach = attachPressFeedback(el)

    el.dispatchEvent(new Event('pointerdown'))
    detach()
    first.resolve(gsap)
    await flush()

    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('does not leak an unhandled rejection when cleanup throws', async () => {
    stubReducedMotion(false)
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      gsap.killTweensOf.mockImplementationOnce(() => {
        throw new Error('kill failed')
      })
      const el = document.createElement('button')
      const detach = attachPressFeedback(el)

      el.dispatchEvent(new Event('pointerdown'))
      await flush()
      detach()
      await flush()

      expect(gsap.killTweensOf).toHaveBeenCalledWith(el)
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})
