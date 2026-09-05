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
})
