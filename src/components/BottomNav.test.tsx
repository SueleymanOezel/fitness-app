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
})
