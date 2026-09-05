import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Dialog from './Dialog'

describe('Dialog', () => {
  it('shows its content when open', () => {
    render(
      <Dialog open onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).toBeVisible()
  })

  it('hides its content when not open', () => {
    render(
      <Dialog open={false} onClose={() => {}}>
        <p>Inhalt</p>
      </Dialog>,
    )
    expect(screen.getByText('Inhalt')).not.toBeVisible()
  })

  it('calls onClose when the close button is activated', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose}>
        <p>Inhalt</p>
      </Dialog>,
    )
    screen.getByRole('button', { name: 'Schließen' }).click()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
