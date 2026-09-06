import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Chip from './Chip'

describe('Chip', () => {
  it('marks an active chip with aria-pressed', () => {
    render(<Chip active>90 Tage</Chip>)
    expect(screen.getByRole('button', { name: '90 Tage' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks an inactive chip as not pressed', () => {
    render(<Chip active={false}>30 Tage</Chip>)
    expect(screen.getByRole('button', { name: '30 Tage' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('forwards the click handler', () => {
    const onClick = vi.fn()
    render(
      <Chip active={false} onClick={onClick}>
        30 Tage
      </Chip>,
    )
    fireEvent.click(screen.getByRole('button', { name: '30 Tage' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('gives the active chip on-bright text and both states hover/press/focus feedback', () => {
    const { rerender } = render(<Chip active>90 Tage</Chip>)
    const active = screen.getByRole('button', { name: '90 Tage' })
    expect(active.className).toContain('text-on-bright')
    expect(active.className).toContain('transition')
    expect(active.className).toContain('active:scale-[0.97]')
    expect(active.className).toContain('focus-visible:ring-2')
    expect(active.className).toContain('focus-visible:ring-offset-2')
    expect(active.className).toContain('focus-visible:ring-offset-bg')

    rerender(<Chip active={false}>90 Tage</Chip>)
    const inactive = screen.getByRole('button', { name: '90 Tage' })
    expect(inactive.className).not.toContain('text-on-bright')
    expect(inactive.className).toContain('transition')
  })
})
