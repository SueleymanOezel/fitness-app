import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { useToast } from './components/ToastProvider'
import { useParams } from 'react-router-dom'
import { renderWithProviders } from './test-render'

function ToastButton() {
  const showToast = useToast()
  return (
    <button type="button" onClick={() => showToast('Hallo', 'success')}>
      Zeigen
    </button>
  )
}

function ParamPage() {
  const { id } = useParams<{ id: string }>()
  return <p>{`id: ${id}`}</p>
}

describe('renderWithProviders', () => {
  it('wraps in a ToastProvider so useToast does not throw', () => {
    renderWithProviders(<ToastButton />)
    expect(screen.getByRole('button', { name: 'Zeigen' })).toBeInTheDocument()
  })

  it('renders a parametrised route when path and route are given', () => {
    renderWithProviders(<ParamPage />, { route: '/thing/abc', path: '/thing/:id' })
    expect(screen.getByText('id: abc')).toBeInTheDocument()
  })
})
