import { useState } from 'react'

/**
 * How many rows of a long list are rendered. The library has ~870 exercises,
 * each with a thumbnail from a third-party host: rendering them all at once
 * starts hundreds of image requests the user never scrolls to. Searching and
 * filtering still run over the whole list; only the rendering is capped.
 *
 * The count goes back to `step` whenever `resetKey` changes (a new search or
 * filter starts at the top) — derived during render, no effect needed.
 */
export const VISIBLE_STEP = 50

export function useVisibleCount(resetKey: string, step = VISIBLE_STEP) {
  const [state, setState] = useState({ key: resetKey, count: step })
  const count = state.key === resetKey ? state.count : step
  return { count, showMore: () => setState({ key: resetKey, count: count + step }) }
}
