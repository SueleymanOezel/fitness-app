import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ZeitraumSwitch from './ZeitraumSwitch'

describe('ZeitraumSwitch', () => {
  it('marks the active zeitraum and leaves the others inactive', () => {
    render(<ZeitraumSwitch wert={90} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '90 Tage' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '30 Tage' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onChange with the picked value', () => {
    const onChange = vi.fn()
    render(<ZeitraumSwitch wert={90} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'alles' }))
    expect(onChange).toHaveBeenCalledWith('alles')
  })
})
