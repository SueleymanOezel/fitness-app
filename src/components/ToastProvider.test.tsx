import { describe, expect, it } from 'vitest'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastProvider'

function TriggerButton({ message, type }: { message: string; type: 'success' | 'error' }) {
  const showToast = useToast()
  return (
    <button type="button" onClick={() => showToast(message, type)}>
      ausloesen
    </button>
  )
}

describe('ToastProvider', () => {
  it('shows a success message with the success styling', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Eintrag gespeichert" type="success" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Eintrag gespeichert')
    expect(alert.className).toContain('bg-success')
  })

  it('shows an error message with the danger styling', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Speichern fehlgeschlagen" type="error" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Speichern fehlgeschlagen')
    expect(alert.className).toContain('bg-danger')
  })

  it('removes the toast on its own after a few seconds', async () => {
    render(
      <ToastProvider>
        <TriggerButton message="Eintrag gespeichert" type="success" />
      </ToastProvider>,
    )
    screen.getByRole('button', { name: 'ausloesen' }).click()
    const alert = await screen.findByRole('alert')

    await waitForElementToBeRemoved(alert, { timeout: 5000 })
  }, 6000)
})
