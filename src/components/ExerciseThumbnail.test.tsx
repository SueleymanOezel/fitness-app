import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ExerciseThumbnail from './ExerciseThumbnail'

afterEach(() => cleanup())

describe('ExerciseThumbnail', () => {
  it('renders the image with a no-referrer policy and empty alt text when a URL is given', () => {
    render(<ExerciseThumbnail bildUrl="https://example.com/bank.jpg" />)
    // Empty alt makes it a decorative image (excluded from the a11y role tree
    // by design — the exercise name is already announced right next to it),
    // so it's queried by alt text rather than role.
    const img = screen.getByAltText('')
    expect(img).toHaveAttribute('src', 'https://example.com/bank.jpg')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('renders a placeholder icon instead of an image when there is no URL', () => {
    render(<ExerciseThumbnail bildUrl={null} />)
    expect(screen.queryByAltText('')).not.toBeInTheDocument()
  })
})
