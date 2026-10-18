import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LinkListCard from './LinkListCard'

afterEach(cleanup)

function zeige(items: Parameters<typeof LinkListCard>[0]['items']) {
  return render(<LinkListCard items={items} />, { wrapper: MemoryRouter })
}

describe('LinkListCard', () => {
  it('rendert jede Zeile als Link in einer einzigen Karte mit Trennlinien', () => {
    zeige([
      { to: '/a', label: 'Pläne', icon: 'plans' },
      { to: '/b', label: 'Historie', icon: 'history' },
    ])
    expect(screen.getByRole('link', { name: 'Pläne' })).toHaveAttribute('href', '/a')
    const liste = screen.getByRole('list')
    expect(liste).toHaveClass('divide-y')
    expect(liste.closest('div')).toHaveClass('bg-surface', 'rounded-3xl')
    expect(screen.getAllByRole('listitem')[0]).not.toHaveClass('bg-surface')
  })

  it('zeigt einen Wert rechts und kann den zugänglichen Namen überschreiben', () => {
    zeige([{ to: '/c', label: 'Frühstück', wert: '150 kcal', ariaLabel: 'Frühstück — 150 kcal' }])
    const link = screen.getByRole('link', { name: 'Frühstück — 150 kcal' })
    expect(link).toHaveTextContent('150 kcal')
  })

  it('kommt ohne Icon aus', () => {
    zeige([{ to: '/d', label: 'Ohne Icon' }])
    expect(screen.getByRole('link', { name: 'Ohne Icon' })).toBeInTheDocument()
  })
})
