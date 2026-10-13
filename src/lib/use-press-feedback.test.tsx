import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'

const attach = vi.fn<(el: HTMLElement) => () => void>(() => vi.fn())
vi.mock('./press-feedback', () => ({ attachPressFeedback: (el: HTMLElement) => attach(el) }))
const load = vi.fn(() => Promise.resolve({}))
vi.mock('./gsap-loader', () => ({ loadGsap: () => load() }))

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

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.useRealTimers()
  vi.resetModules()
})

async function renderProbe() {
  const { usePressFeedback } = await import('./use-press-feedback')
  function Probe() {
    const ref = useRef<HTMLButtonElement>(null)
    usePressFeedback(ref)
    return <button ref={ref}>x</button>
  }
  return render(<Probe />)
}

describe('usePressFeedback', () => {
  it('attaches to the element and detaches on unmount', async () => {
    stubReducedMotion(false)
    const detach = vi.fn()
    attach.mockReturnValueOnce(detach)
    const { unmount, getByRole } = await renderProbe()

    expect(attach).toHaveBeenCalledWith(getByRole('button'))
    unmount()
    expect(detach).toHaveBeenCalledOnce()
  })

  it('preloads the gsap chunk once when the browser is idle', async () => {
    stubReducedMotion(false)
    vi.useFakeTimers()
    await renderProbe()
    await renderProbe()

    expect(load).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(load).toHaveBeenCalledOnce()
  })

  it('defers the preload to requestIdleCallback when the browser provides it', async () => {
    stubReducedMotion(false)
    const callbacks: Array<() => void> = []
    const idle = vi.fn((cb: () => void) => {
      callbacks.push(cb)
      return 1
    })
    vi.stubGlobal('requestIdleCallback', idle)
    await renderProbe()

    expect(idle).toHaveBeenCalledOnce()
    expect(load).not.toHaveBeenCalled()
    callbacks.forEach((cb) => cb())
    expect(load).toHaveBeenCalledOnce()
  })

  it('does not preload under reduced motion', async () => {
    stubReducedMotion(true)
    vi.useFakeTimers()
    await renderProbe()

    vi.advanceTimersByTime(1000)
    expect(load).not.toHaveBeenCalled()
  })
})
