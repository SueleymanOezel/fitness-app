/**
 * A single, synchronous check rather than a subscribing hook: every caller
 * in this codebase reads it once, at the moment an animation would start,
 * not continuously while mounted. Add a reactive hook only if a future
 * caller actually needs to respond to the setting changing mid-session.
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
