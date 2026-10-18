import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import SetEditDialog from './SetEditDialog'
import { WIEDERHOLUNGEN_FEHLER } from '../lib/set-values'

vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))

afterEach(cleanup)

const satz = {
  id: 'set1',
  exercise_id: 'ex1',
  satz_nummer: 1,
  gewicht: 60,
  wiederholungen: 10,
  rir: 2,
  ist_aufwaermsatz: false,
  abgeschlossen_am: '2026-08-21T10:05:00.000Z',
  exercise: { id: 'ex1', name: 'Bench Press', name_de: 'Bankdrücken', met_wert: 5 },
}

function formular() {
  return within(screen.getByRole('heading', { name: 'Satz bearbeiten' }).closest('form') as HTMLElement)
}

describe('SetEditDialog', () => {
  it('renders nothing while no set is being edited', () => {
    render(<SetEditDialog set={null} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(screen.queryByRole('heading', { name: 'Satz bearbeiten' })).not.toBeInTheDocument()
  })

  it('prefills the stored values', () => {
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(formular().getByLabelText('Gewicht (kg)')).toHaveValue('60')
    expect(formular().getByLabelText('Wiederholungen')).toHaveValue('10')
    expect(formular().getByRole('button', { name: '2' })).toHaveAttribute('aria-pressed', 'true')
    expect(formular().getByLabelText('Aufwärmsatz')).not.toBeChecked()
  })

  it('prefills an empty weight as empty, not as "null"', () => {
    render(<SetEditDialog set={{ ...satz, gewicht: null }} onClose={vi.fn()} onSave={vi.fn()} />)
    expect(formular().getByLabelText('Gewicht (kg)')).toHaveValue('')
  })

  it('saves the changed values and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '12' } })
    fireEvent.change(formular().getByLabelText('Gewicht (kg)'), { target: { value: '62,5' } })
    fireEvent.click(formular().getByRole('button', { name: '3' }))
    fireEvent.click(formular().getByLabelText('Aufwärmsatz'))
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('set1', {
        gewicht: 62.5,
        wiederholungen: 12,
        rir: 3,
        ist_aufwaermsatz: true,
      }),
    )
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('refuses empty repetitions with the message inside the dialog and does not save', async () => {
    const onSave = vi.fn()
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '' } })
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    expect(await formular().findByText(WIEDERHOLUNGEN_FEHLER)).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('stays open with an inline message when saving fails and keeps the typed values', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'))
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)

    fireEvent.change(formular().getByLabelText('Wiederholungen'), { target: { value: '11' } })
    fireEvent.click(formular().getByRole('button', { name: 'Speichern' }))

    expect(await formular().findByText('Satz konnte nicht gespeichert werden.')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(formular().getByLabelText('Wiederholungen')).toHaveValue('11')
  })

  it('closes via Abbrechen without saving', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<SetEditDialog set={satz} onClose={onClose} onSave={onSave} />)
    fireEvent.click(formular().getByRole('button', { name: 'Abbrechen' }))
    expect(onClose).toHaveBeenCalled()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('does not save twice on a double tap', async () => {
    let resolve: () => void = () => {}
    const onSave = vi.fn().mockReturnValue(new Promise<void>((done) => { resolve = done }))
    render(<SetEditDialog set={satz} onClose={vi.fn()} onSave={onSave} />)

    const speichern = formular().getByRole('button', { name: 'Speichern' })
    fireEvent.click(speichern)
    fireEvent.click(speichern)
    resolve()

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
  })
})
