import { describe, expect, it, vi } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test-render'
import FoodEntryList from './FoodEntryList'
import type { FoodEntry } from '../hooks/use-food-entries'

const entries: FoodEntry[] = [
  {
    id: 'e1',
    menge: 150,
    zeitpunkt: '2026-08-19T06:30:00.000Z',
    product_id: 'p1',
    mahlzeit: null,
    products: {
      id: 'p1',
      name: 'Testprodukt',
      barcode: null,
      created_by: 'u1',
      kalorien: 100,
      eiweiss: 1,
      fett: 2,
      kohlenhydrate: 3,
      ballaststoffe: null,
      zucker: null,
      salz: null,
    },
  },
]

describe('FoodEntryList', () => {
  it('shows a placeholder when there are no entries', () => {
    renderWithProviders(
      <FoodEntryList
        entries={[]}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRestore={vi.fn()}
      />,
    )
    expect(screen.getByText('Noch keine Einträge heute.')).toBeInTheDocument()
  })

  it('shows the stored values without an input field', () => {
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRestore={vi.fn()}
      />,
    )

    expect(screen.getByText('Testprodukt')).toBeInTheDocument()
    expect(screen.getByText(/150 g/)).toBeInTheDocument()
    // 100 kcal/100 g × 150 g = 150 kcal.
    expect(screen.getByText(/150 kcal/)).toBeInTheDocument()
    // The amount was silently editable before and nobody found it.
    expect(screen.queryByLabelText('Menge (g) für Testprodukt')).not.toBeInTheDocument()
  })

  it('shows the entries as divided rows of one card, not one card per entry', () => {
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRestore={vi.fn()}
      />,
    )

    const liste = screen.getByText('Testprodukt').closest('ul')
    expect(liste).toHaveClass('divide-y')
    expect(liste?.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getByText('Testprodukt').closest('li')).not.toHaveClass('bg-surface')
  })

  it('opens the edit form on request and closes it again', () => {
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
        onRestore={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bearbeiten/ }))
    expect(screen.getByLabelText('Menge (g)')).toHaveValue(150)

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }))
    expect(screen.queryByLabelText('Menge (g)')).not.toBeInTheDocument()
  })

  // Re-audit 26.10.2026: no second question for one entry, the toast offers the way back.
  it('deletes at once and offers to undo it from the toast', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined)
    const onRestore = vi.fn().mockResolvedValue(undefined)
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
        onRestore={onRestore}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bearbeiten/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag löschen' }))

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('e1'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Testprodukt gelöscht.')
    fireEvent.click(screen.getByRole('button', { name: 'Rückgängig' }))
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(entries[0]))
  })

  it('shows a visible warning in the dialog when the delete is rejected', async () => {
    const onDelete = vi.fn().mockRejectedValue(new Error('delete failed'))
    renderWithProviders(
      <FoodEntryList
        entries={entries}
        userId="u1"
        sections={[{ slot: 1, name: 'Frühstück' }]}
        onUpdateEntry={vi.fn().mockResolvedValue(undefined)}
        onDelete={onDelete}
        onRestore={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /bearbeiten/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Eintrag löschen' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Eintrag konnte nicht gelöscht werden.'))
    expect(screen.getByLabelText('Menge (g)')).toBeInTheDocument()
  })
})