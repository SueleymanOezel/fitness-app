import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HilfeKnopf from './HilfeKnopf'
import { BEGRIFFE } from '../lib/glossary'

describe('HilfeKnopf', () => {
  it('names the term on the button and points it at the explanation', () => {
    render(<HilfeKnopf begriff="volumen" />)
    const knopf = screen.getByRole('button', { name: 'Was heißt Volumen?' })
    const ziel = document.getElementById(knopf.getAttribute('popovertarget')!)
    expect(ziel).toHaveAttribute('popover', 'auto')
    expect(ziel).toHaveTextContent(BEGRIFFE.volumen.text)
  })

  it('gives every instance its own popover', () => {
    render(
      <>
        <HilfeKnopf begriff="einsRM" />
        <HilfeKnopf begriff="einsRM" />
      </>,
    )
    const [a, b] = screen.getAllByRole('button')
    expect(a.getAttribute('popovertarget')).not.toBe(b.getAttribute('popovertarget'))
  })
})
