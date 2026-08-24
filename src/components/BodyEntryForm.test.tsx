import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BodyEntryForm from './BodyEntryForm'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'

afterEach(cleanup)

describe('BodyEntryForm', () => {
  it('defaults the date to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 9, 0, 0))
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-24')
    vi.useRealTimers()
  })

  it('allows fractional values in every measurement field', () => {
    // Without step="any" the browser treats 82.5 as a stepMismatch and blocks
    // the whole submit with a native tooltip.
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    for (const label of [
      'Gewicht (kg)',
      'Bauchumfang (cm)',
      'Beinumfang (cm)',
      'Armumfang (cm)',
      'Rückenumfang (cm)',
      'Brustumfang (cm)',
      'Körperfettanteil (%)',
    ]) {
      expect(screen.getByLabelText(label)).toHaveAttribute('step', 'any')
    }
  })

  it('saves the values that were entered', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        '2026-08-24',
        expect.objectContaining({ gewicht: 82.5, bauchumfang: null }),
      ),
    )
  })

  it('refuses an entry in which nothing was measured', async () => {
    const onSave = vi.fn()
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('refuses an implausible value without writing', async () => {
    const onSave = vi.fn()
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows a message instead of closing when saving fails', async () => {
    // supabase-js resolves on a rejected write; an unchecked failure would look
    // like success and lose the typed values.
    const onClose = vi.fn()
    render(
      <BodyEntryForm onSave={vi.fn().mockRejectedValue(new Error('boom'))} onClose={onClose} />,
    )

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.5)
  })

  it('fills the fields from an entry that is being corrected', () => {
    render(
      <BodyEntryForm
        entry={{
          id: 'a',
          datum: '2026-08-17',
          gewicht: 83.3,
          bauchumfang: 90,
          beinumfang: null,
          armumfang: null,
          ruckenumfang: null,
          brustumfang: null,
          koerperfettanteil: null,
        }}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-17')
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(83.3)
    expect(screen.getByLabelText('Beinumfang (cm)')).toHaveValue(null)
  })

  it('treats a failed profile weight sync as success, since the entry was saved', async () => {
    // ProfileWeightSyncError means body_metrics was already written; only the
    // profiles mirror failed. Reporting this as a save failure would make the
    // user retype data that is already stored.
    const onClose = vi.fn()
    render(
      <BodyEntryForm
        onSave={vi.fn().mockRejectedValue(new ProfileWeightSyncError())}
        onClose={onClose}
      />,
    )

    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
