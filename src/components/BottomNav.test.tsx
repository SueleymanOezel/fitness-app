import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import BottomNav from './BottomNav'

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
    expect(home.className).toContain('active:scale-[0.97]')
    expect(home.className).toContain('focus-visible:ring-2')
    expect(home.className).toContain('focus-visible:ring-offset-2')
    expect(home.className).toContain('focus-visible:ring-offset-surface-raised')
  })
})
