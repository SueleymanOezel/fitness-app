import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import BodyEntryForm from './BodyEntryForm'
import { ProfileWeightSyncError } from '../hooks/use-body-metrics'

afterEach(() => {
  cleanup()
  // Here rather than at the end of the test that installs them: a failing test
  // would otherwise leak fake timers into every test after it.
  vi.useRealTimers()
})

describe('BodyEntryForm', () => {
  it('marks the weight as the field the dialog focuses and folds the other measurements', () => {
    const { container } = render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText('Gewicht (kg)')).toHaveAttribute('data-autofocus')
    expect(container.querySelector('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Umfänge und Körperfett')).toBeInTheDocument()
  })

  it('is titled for a new entry and names the date when correcting one', () => {
    const { unmount } = render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Werte eintragen' })).toBeInTheDocument()
    unmount()

    render(
      <BodyEntryForm
        entry={{
          id: 'a',
          datum: '2026-08-17',
          gewicht: 83.3,
          bauchumfang: null,
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
    expect(screen.getByRole('heading', { name: 'Werte vom 17.08.2026' })).toBeInTheDocument()
  })

  it('shows the other measurements unfolded when the corrected entry has some', () => {
    const { container } = render(
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

    expect(container.querySelector('details')).toHaveAttribute('open')
  })

  // Re-audit 27.10.2026 (efficiency): the morning weigh-in is a small correction, not typing the whole number.
  it('starts a new day from the last weight', () => {
    render(<BodyEntryForm letztesGewicht={82.4} onSave={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.4)
    expect(screen.getByLabelText('Bauchumfang (cm)')).toHaveValue(null)
  })

  it('drops the untouched prefill when a missed earlier day is entered', () => {
    render(<BodyEntryForm letztesGewicht={82.4} onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '' } })
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.4)
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-01-05' } })
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(null)

    // A weight typed afterwards is the user's, even when it equals the old prefill.
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '82.4' } })
    fireEvent.change(screen.getByLabelText('Datum'), { target: { value: '2026-01-04' } })
    expect(screen.getByLabelText('Gewicht (kg)')).toHaveValue(82.4)
  })

  // Re-audit 27.10.2026: "900" as weight saved nothing, with a summary hidden under the sticky buttons.
  it('marks a wrong weight at the field, moves focus there and keeps the dialog open', async () => {
    const onSave = vi.fn()
    render(<BodyEntryForm onSave={onSave} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Gewicht (kg)'), { target: { value: '900' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Bitte prüfen: Gewicht.')
    const feld = screen.getByLabelText(/^Gewicht \(kg\)/)
    expect(feld).toHaveAttribute('aria-invalid', 'true')
    expect(feld).toHaveAccessibleDescription('Bitte 30–300 kg angeben.')
    await waitFor(() => expect(document.activeElement).toBe(feld))
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.change(feld, { target: { value: '90' } })
    expect(feld).not.toHaveAttribute('aria-invalid')
  })

  it('unfolds the measurements when the wrong value is in there', () => {
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Bauchumfang (cm)'), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(screen.getByText('Umfänge und Körperfett').closest('details')).toHaveAttribute('open')
    expect(screen.getByText('Bitte 10–300 cm angeben.')).toBeInTheDocument()
  })

  it('asks for at least one value when everything is empty', () => {
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Speichern' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Bitte mindestens einen Wert eintragen.')
  })

  it('defaults the date to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 9, 0, 0))
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText('Datum')).toHaveValue('2026-08-24')
  })

  it('does not accept a date in the future', () => {
    // A future date — or 0007-08-24 from a mistyped year — sorts to the top of
    // the history and would hold profiles.aktuelles_gewicht there indefinitely.
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 7, 24, 9, 0, 0))
    render(<BodyEntryForm onSave={vi.fn()} onClose={vi.fn()} />)

    expect(screen.getByLabelText('Datum')).toHaveAttribute('max', '2026-08-24')
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
