import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import Dialog from './Dialog'
import { loadGsap } from '../lib/gsap-loader'

const gsap = {
  fromTo: vi.fn(),
  to: vi.fn((_target: unknown, vars: { onComplete?: () => void }) => {
    vars.onComplete?.()
  }),
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
