import { describe, expect, it } from 'vitest'
import { render, screen, waitForElementToBeRemoved, waitFor } from '@testing-library/react'
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

  it('does not clear a newer toast with an old timer when called twice in quick succession', async () => {
    function MultiTriggerButton() {
      const showToast = useToast()
      const handleFirstClick = () => {
        showToast('erster Toast', 'success')
      }
      const handleSecondClick = () => {
        showToast('zweiter Toast', 'error')
      }
      return (
        <>
          <button type="button" onClick={handleFirstClick}>
            erster
          </button>
          <button type="button" onClick={handleSecondClick}>
            zweiter
          </button>
        </>
      )
    }

    render(
      <ToastProvider>
        <MultiTriggerButton />
      </ToastProvider>,
    )

    // Show first toast
    screen.getByRole('button', { name: 'erster' }).click()
    const firstAlert = await screen.findByRole('alert')
    expect(firstAlert).toHaveTextContent('erster Toast')

    // Wait a very short time before showing second toast (less than 4000ms)
    await new Promise(resolve => setTimeout(resolve, 50))

    // Show second toast immediately
    screen.getByRole('button', { name: 'zweiter' }).click()

    // Wait for the toast text to change to the second message
    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('zweiter Toast')
    })

    const secondAlert = screen.getByRole('alert')
    expect(secondAlert.className).toContain('bg-danger')

    // The second toast should remain visible for close to 4000ms
    // Wait 3900ms more (total ~3950ms from first toast start, but 3900ms from second toast start)
    await new Promise(resolve => setTimeout(resolve, 3900))

    // Second toast should still be visible
    expect(screen.getByRole('alert')).toHaveTextContent('zweiter Toast')

    // Now wait for the second toast to auto-dismiss (100ms more for total 4000ms from second toast)
    await new Promise(resolve => setTimeout(resolve, 150))

    // Now the second toast should be removed
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  }, 9000)
})
