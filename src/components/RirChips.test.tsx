import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import RirChips from './RirChips'

afterEach(cleanup)

describe('RirChips', () => {
  it('shows the scale 0 to 5+ and marks the selected value', () => {
    render(<RirChips value={2} onChange={vi.fn()} />)
    expect(screen.getByRole('group', { name: 'Wie viele hättest du noch geschafft?' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '5+' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a value, and clears it when the same value is tapped again', () => {
    const onChange = vi.fn()
    const { rerender } = render(<RirChips value={null} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith(3)
    rerender(<RirChips value={3} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })
})
