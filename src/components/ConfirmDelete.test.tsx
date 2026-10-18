import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import ConfirmDelete from './ConfirmDelete'

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))

afterEach(cleanup)

function renderIt(onConfirm: () => Promise<void>) {
  render(<ConfirmDelete label="Löschen" titel="Eintrag löschen?" text="Das lässt sich nicht rückgängig machen." onConfirm={onConfirm} />)
}

describe('ConfirmDelete', () => {
  it('does not delete on the first tap, only asks', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderIt(onConfirm)

    expect(screen.queryByRole('heading', { name: 'Eintrag löschen?' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))

    expect(screen.getByRole('heading', { name: 'Eintrag löschen?' })).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('deletes exactly once after the confirmation and closes', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderIt(onConfirm)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Eintrag löschen?' })).not.toBeInTheDocument())
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not delete on cancel', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    renderIt(onConfirm)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Eintrag löschen?' })).not.toBeInTheDocument()
  })

  it('shows a failure inside the dialog and stays open so the user can retry', async () => {
    const onConfirm = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined)
    renderIt(onConfirm)

    fireEvent.click(screen.getByRole('button', { name: 'Löschen' }))
    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Das hat nicht geklappt')
    expect(screen.getByRole('heading', { name: 'Eintrag löschen?' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Endgültig löschen' }))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Eintrag löschen?' })).not.toBeInTheDocument())
    expect(onConfirm).toHaveBeenCalledTimes(2)
  })
})
