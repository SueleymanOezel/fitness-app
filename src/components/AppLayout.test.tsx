import { describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
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

  it('offers help next to the profile on every area screen', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Hilfe' })
    expect(link).toHaveAttribute('href', '/profile/hilfe')
    expect(link).toHaveClass('min-h-11', 'min-w-11')
  })

  it('drops the tab bar in the live workout and offers the way back at the top instead', () => {
    render(
      <MemoryRouter initialEntries={['/training/session/s1']}>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Profil' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Zurück zum Training' })).toHaveAttribute('href', '/training')
  })

  it('puts the way back at the top of every sub page, with the tab bar kept', () => {
    render(
      <MemoryRouter initialEntries={['/body/entries']}>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Zurück zum Körperbereich' })).toHaveAttribute('href', '/body')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('keeps the tab bar everywhere else', () => {
    render(
      <MemoryRouter initialEntries={['/training']}>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  it('moves focus to the page content after a page change, but not on the first load', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    const main = screen.getByRole('main')
    expect(main).not.toHaveFocus()

    const trainingTab = screen.getByRole('link', { name: /Training/ })
    trainingTab.focus()
    act(() => {
      trainingTab.click()
    })
    expect(main).toHaveFocus()
  })

  it('tells the user when the device goes offline and hides the notice when it is back', () => {
    render(
      <MemoryRouter>
        <AppLayout>
          <p>content</p>
        </AppLayout>
      </MemoryRouter>,
    )
    expect(screen.queryByText(/Du bist offline/)).not.toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('status')).toHaveTextContent('Du bist offline')

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/Du bist offline/)).not.toBeInTheDocument()
  })
})
