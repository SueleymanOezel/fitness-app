import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CompletionCelebration from './CompletionCelebration'
import { loadGsap } from '../lib/gsap-loader'
import { prefersReducedMotion } from '../lib/motion'

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))
vi.mock('../lib/motion', () => ({ prefersReducedMotion: vi.fn(() => false) }))

const inhalt = (
  <p>
    <span data-count-to={25}>25</span> Minuten
  </p>
)

describe('CompletionCelebration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows final values while GSAP has not loaded', () => {
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(loadGsap).toHaveBeenCalledOnce()
  })

  it('does not load GSAP under reduced motion', () => {
    vi.mocked(prefersReducedMotion).mockReturnValueOnce(true)
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    expect(screen.getByText('25')).toBeInTheDocument()
    expect(loadGsap).not.toHaveBeenCalled()
  })

  it('stays static when the GSAP import fails', async () => {
    vi.mocked(loadGsap).mockRejectedValueOnce(new Error('offline'))
    render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
    await Promise.resolve()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  describe('with GSAP loaded', () => {
    const revert = vi.fn()
    const tl = { to: vi.fn(), from: vi.fn(), fromTo: vi.fn() }
    const gsap = {
      timeline: vi.fn(() => tl),
      context: vi.fn((fn: () => void) => {
        fn()
        return { revert }
      }),
    }
    const mitRekord = (
      <>
        {inhalt}
        <ul>
          <li data-pr-card>
            <span data-sweep aria-hidden="true" />
            Bankdrücken
          </li>
        </ul>
        <p data-reveal>Streak</p>
      </>
    )

    it('animates counters, PR cards and the streak line, and reverts on unmount', async () => {
      vi.mocked(loadGsap).mockResolvedValueOnce(gsap as never)
      const { unmount } = render(<CompletionCelebration>{mitRekord}</CompletionCelebration>)
      await waitFor(() => expect(tl.fromTo).toHaveBeenCalledOnce())

      expect(tl.to).toHaveBeenCalledOnce()
      expect(tl.from).toHaveBeenCalledTimes(2)
      // onComplete pins the exact final value even if the last tick rounds differently.
      tl.to.mock.calls[0][1].onUpdate()
      tl.to.mock.calls[0][1].onComplete()
      expect(screen.getByText('25')).toBeInTheDocument()

      unmount()
      expect(revert).toHaveBeenCalledOnce()
    })

    it('skips the PR tweens when there are no PR cards', async () => {
      vi.mocked(loadGsap).mockResolvedValueOnce(gsap as never)
      render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
      await waitFor(() => expect(tl.to).toHaveBeenCalledOnce())

      expect(tl.fromTo).not.toHaveBeenCalled()
      expect(tl.from).toHaveBeenCalledOnce()
      expect(tl.from).toHaveBeenCalledWith('[data-reveal]', expect.anything(), expect.anything())
    })

    it('does not animate when unmounted before GSAP has loaded', async () => {
      let resolveLoad: (g: typeof gsap) => void = () => {}
      vi.mocked(loadGsap).mockReturnValueOnce(new Promise((r) => (resolveLoad = r)) as never)
      const { unmount } = render(<CompletionCelebration>{inhalt}</CompletionCelebration>)
      unmount()
      resolveLoad(gsap)
      await new Promise((r) => setTimeout(r, 0))

      expect(gsap.context).not.toHaveBeenCalled()
    })
  })
})
