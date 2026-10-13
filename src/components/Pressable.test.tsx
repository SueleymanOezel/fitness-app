import { describe, expect, it, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Pressable, { PressableLink } from './Pressable'

const attach = vi.fn<(el: HTMLElement) => () => void>(() => vi.fn())
vi.mock('../lib/press-feedback', () => ({ attachPressFeedback: (el: HTMLElement) => attach(el) }))
vi.mock('../lib/gsap-loader', () => ({ loadGsap: () => Promise.resolve({}) }))

describe('Pressable', () => {
  it('renders a button with the variant classes and passes props through', () => {
    const onClick = vi.fn()
    render(
      <Pressable variant="primary" type="submit" className="extra" onClick={onClick}>
        Speichern
      </Pressable>,
    )
    const button = screen.getByRole('button', { name: 'Speichern' })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass('bg-accent', 'extra')
    button.click()
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not invent a type, so a bare button stays a submit button as before', () => {
    render(<Pressable>Ohne Typ</Pressable>)
    expect(screen.getByRole('button')).not.toHaveAttribute('type')
  })

  it.each([
    ['primary', 'bg-accent'],
    ['secondary', 'bg-surface'],
    ['danger', 'text-danger'],
  ] as const)('variant %s carries its look', (variant, cls) => {
    render(<Pressable variant={variant}>x</Pressable>)
    expect(screen.getByRole('button')).toHaveClass(cls)
  })

  it('bare adds no variant classes', () => {
    render(<Pressable className="mine">x</Pressable>)
    expect(screen.getByRole('button').className).toBe('mine')
  })

  it('attaches tap feedback to its element and forwards the ref', () => {
    const ref = createRef<HTMLButtonElement>()
    render(<Pressable ref={ref}>x</Pressable>)
    expect(attach).toHaveBeenCalledWith(screen.getByRole('button'))
    expect(ref.current).toBe(screen.getByRole('button'))
  })

  it('keeps disabled buttons inert', () => {
    const onClick = vi.fn()
    render(
      <Pressable disabled onClick={onClick}>
        x
      </Pressable>,
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })
})

describe('PressableLink', () => {
  it('renders a router link with variant classes and tap feedback', () => {
    render(
      <MemoryRouter>
        <PressableLink to="/training" variant="primary">
          Training
        </PressableLink>
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: 'Training' })
    expect(link).toHaveAttribute('href', '/training')
    expect(link).toHaveClass('bg-accent')
    expect(attach).toHaveBeenCalledWith(link)
  })
})
