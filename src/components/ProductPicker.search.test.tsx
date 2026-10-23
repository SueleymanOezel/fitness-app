import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import ProductPicker from './ProductPicker'
import AddEntryFlow from './AddEntryFlow'

const produkt = (id: string, name: string, kalorien = 100) => ({
  id,
  name,
  barcode: null,
  kalorien,
  eiweiss: null,
  fett: null,
  kohlenhydrate: null,
  ballaststoffe: null,
  zucker: null,
  salz: null,
})

const mockZuletzt = vi.fn()
const mockSuche = vi.fn()
vi.mock('../hooks/use-product-search', () => ({
  useZuletztGegessen: () => mockZuletzt(),
  useProduktSuche: (_userId: unknown, suche: string) => mockSuche(suche),
}))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: vi.fn(() => new Promise(() => {})) }))

beforeEach(() => {
  mockZuletzt.mockReturnValue([
    { product: produkt('p1', 'Haferflocken', 372), letzteMenge: 80 },
    { product: produkt('p2', 'Skyr Natur', 63), letzteMenge: 250 },
  ])
  mockSuche.mockReturnValue({ produkte: [], laedt: false })
})
afterEach(cleanup)

describe('ProductPicker: recent products and search', () => {
  it('offers the recently eaten products first, with the amount of last time', () => {
    const onPicked = vi.fn()
    render(<ProductPicker onPicked={onPicked} onCancel={vi.fn()} />)

    const liste = within(screen.getByRole('list', { name: 'Zuletzt gegessen' }))
    expect(liste.getByText('zuletzt 80 g · 372 kcal / 100 g')).toBeInTheDocument()
    fireEvent.click(liste.getByRole('button', { name: /Haferflocken/ }))

    expect(onPicked).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }), 80)
  })

  it('filters the recent products by name and adds other matches after them', () => {
    mockSuche.mockImplementation((suche: string) =>
      suche === 'sky'
        ? { produkte: [produkt('p2', 'Skyr Natur', 63), produkt('p9', 'Skyr Vanille', 80)], laedt: false }
        : { produkte: [], laedt: false },
    )
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Produkt suchen'), { target: { value: 'sky' } })

    const namen = within(screen.getByRole('list', { name: 'Suchergebnisse' }))
      .getAllByRole('button')
      .map((button) => button.textContent)
    // Own product first (with last amount), the duplicate from the search is not repeated.
    expect(namen).toEqual(['Skyr Naturzuletzt 250 g · 63 kcal / 100 g', 'Skyr Vanille80 kcal / 100 g'])
  })

  it('says when nothing matches and points to the other ways', () => {
    render(<ProductPicker onPicked={vi.fn()} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('Produkt suchen'), { target: { value: 'xyz' } })

    expect(screen.getByText(/Nichts gefunden/)).toBeInTheDocument()
  })

  it('starts the amount at last time\'s portion when a recent product is picked', () => {
    render(<AddEntryFlow onAdd={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Skyr Natur/ }))

    expect(screen.getByLabelText('Menge (g)')).toHaveValue('250')
  })
})
