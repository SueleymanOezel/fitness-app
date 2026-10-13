import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Dialog from './Dialog'
import { loadGsap } from '../lib/gsap-loader'

const revert = vi.fn()
const gsap = {
  fromTo: vi.fn(),
  to: vi.fn((_target: unknown, vars: { onComplete?: () => void }) => {
    vars.onComplete?.()
  }),
  context: vi.fn(() => ({ add: (fn: () => void) => fn(), revert })),
}
vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => Promise.resolve(gsap)) }))

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
  vi.clearAllMocks()
  vi.mocked(loadGsap).mockImplementation(() => Promise.resolve(gsap as never))
})

describe('Dialog', () => {
  it('shows its content when open', () => {
    render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).toBeVisible()
  })

  it('hides its content when not open', () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).not.toBeVisible()
  })

  it('calls onClose when the close button is activated', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )
    screen.getByRole('button', { name: 'Schließen' }).click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Dialog animation', () => {
  it('animates in via gsap when the user has not requested reduced motion', async () => {
    stubReducedMotion(false)

    render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )

    await waitFor(() => expect(gsap.fromTo).toHaveBeenCalledOnce())
  })

  it('animates out via gsap before closing when the user has not requested reduced motion', async () => {
    stubReducedMotion(false)
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )

    screen.getByRole('button', { name: 'Schließen' }).click()

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(gsap.to).toHaveBeenCalledOnce()
  })

  it('still closes when gsap fails to load', async () => {
    stubReducedMotion(false)
    vi.mocked(loadGsap).mockRejectedValue(new Error('chunk failed'))
    const onClose = vi.fn()

    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )

    screen.getByRole('button', { name: 'Schließen' }).click()

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(gsap.to).not.toHaveBeenCalled()
  })

  it('closes instantly, without animating, when its children are already gone', async () => {
    stubReducedMotion(false)
    const onClose = vi.fn()

    const { rerender } = render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )
    rerender(
      <Dialog open={false} onClose={onClose}>
        {null}
      </Dialog>,
    )

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(gsap.to).not.toHaveBeenCalled()
  })
})

describe('Dialog unmount', () => {
  it('reverts its gsap context when unmounted', async () => {
    stubReducedMotion(false)
    const { unmount } = render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    await waitFor(() => expect(gsap.fromTo).toHaveBeenCalledOnce())

    // RTL's auto-cleanup unmounts earlier tests' dialogs after our afterEach
    // has cleared the mocks, so their revert() calls leak into this test.
    revert.mockClear()
    unmount()

    expect(revert).toHaveBeenCalledOnce()
  })

  it('does not animate when unmounted before gsap has loaded', async () => {
    stubReducedMotion(false)
    let resolveLoad: (g: typeof gsap) => void = () => {}
    vi.mocked(loadGsap).mockReturnValueOnce(new Promise((r) => (resolveLoad = r)) as never)

    const { unmount } = render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    unmount()
    resolveLoad(gsap)
    await new Promise((r) => setTimeout(r, 0))

    expect(gsap.fromTo).not.toHaveBeenCalled()
  })
})
