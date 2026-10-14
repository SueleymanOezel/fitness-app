import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AppLayout from './AppLayout'

vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: vi.fn(() => vi.fn()) }))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve({}) }))

describe('AppLayout', () => {
  it('gives the profile link a 44px tap target', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Profil' })
    expect(link).toHaveClass('min-h-11', 'min-w-11')
  })
})
