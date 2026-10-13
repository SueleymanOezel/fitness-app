import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import Pressable from './Pressable'

// Real attachPressFeedback on purpose: only GSAP itself is mocked, so these
// tests prove what the user would see (a tween or none), not wiring.
const gsap = { to: vi.fn(), killTweensOf: vi.fn(), set: vi.fn() }
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve(gsap) }))

const flush = () => new Promise((r) => setTimeout(r, 0))

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

function stubMotionAllowed() {
  vi.spyOn(window, 'matchMedia').mockReturnValue({
    matches: false,
    media: '',
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

describe('Pressable tap feedback', () => {
  it('scales an enabled button on press but leaves a disabled one alone', async () => {
    stubMotionAllowed()
    const onEnabled = vi.fn()
    const onDisabled = vi.fn()
    render(
      <>
        <Pressable onClick={onEnabled}>Aktiv</Pressable>
        <Pressable disabled onClick={onDisabled}>
          Gesperrt
        </Pressable>
      </>,
    )
    const enabled = screen.getByRole('button', { name: 'Aktiv' })
    const disabled = screen.getByRole('button', { name: 'Gesperrt' })

    fireEvent.pointerDown(disabled)
    fireEvent.pointerUp(disabled)
    fireEvent.click(disabled)
    await flush()
    expect(gsap.to).not.toHaveBeenCalled()
    expect(onDisabled).not.toHaveBeenCalled()

    fireEvent.pointerDown(enabled)
    await flush()
    expect(gsap.to).toHaveBeenCalledWith(enabled, expect.objectContaining({ scale: 0.96 }))
    fireEvent.click(enabled)
    expect(onEnabled).toHaveBeenCalledOnce()
  })
})
