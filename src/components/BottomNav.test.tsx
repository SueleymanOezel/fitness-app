import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'
import { attachPressFeedback } from '../lib/press-feedback'

vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: vi.fn(() => vi.fn()) }))

function renderNav(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('renders all four areas as accessible links', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Training' })).toHaveAttribute('href', '/training')
    expect(screen.getByRole('link', { name: 'Ernährung' })).toHaveAttribute('href', '/nutrition')
    expect(screen.getByRole('link', { name: 'Körper' })).toHaveAttribute('href', '/body')
  })

  it('labels every icon with a visible word', () => {
    renderNav()
    for (const wort of ['Home', 'Training', 'Ernährung', 'Körper']) {
      expect(screen.getByText(wort)).toBeInTheDocument()
    }
  })

  it('keeps the pill symmetric and capped: safe area as offset, not as inner padding', () => {
    renderNav()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('max-w-sm', 'p-2', 'bottom-[calc(1rem+env(safe-area-inset-bottom))]')
    expect(nav.style.paddingBottom).toBe('')
  })

  it('marks the active area distinctly from the inactive ones', () => {
    renderNav('/training')
    const active = screen.getByRole('link', { name: 'Training' })
    const inactive = screen.getByRole('link', { name: 'Ernährung' })
    expect(active.className).toContain('text-accent')
    expect(inactive.className).not.toContain('text-accent')
  })

  it('gives every nav link hover, press and focus-visible feedback', () => {
    renderNav()
    const home = screen.getByRole('link', { name: 'Home' })
    expect(home.className).toContain('transition')
    expect(home.className).toContain('hover:brightness-110')
    expect(home.className).toContain('focus-visible:ring-2')
    expect(home.className).toContain('focus-visible:ring-text')
    expect(home.className).toContain('focus-visible:ring-offset-2')
    expect(home.className).toContain('focus-visible:ring-offset-surface-raised')
  })

  // The elastic spring overshoots 1.0 while the active fill swaps, which read as the bar
  // growing and shrinking on a tap (user report 23.10.2026). Tabs only dim while pressed.
  it('does not spring the tabs on tap, they only dim', () => {
    renderNav()
    expect(attachPressFeedback).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Training' }).className).toContain('active:opacity-80')
  })

  // iOS lifts and enlarges a held link for its preview, then shrinks it back (still seen on iPhone after #115).
  it('turns off the iOS link preview and text selection on the tabs', () => {
    renderNav()
    const tab = screen.getByRole('link', { name: 'Training' })
    expect(tab.className).toContain('[-webkit-touch-callout:none]')
    expect(tab.className).toContain('select-none')
  })
})
