/**
 * GSAP is loaded on demand, never from the app's initial bundle: most pages
 * never trigger an animation, and the app already carries a documented
 * bundle-size warning (see CLAUDE.md, "Vor dem Live-Gang"). Every caller
 * goes through this one function, so there is exactly one dynamic import to
 * mock in tests and exactly one place GSAP can ever enter a bundle chunk.
 */
export async function loadGsap() {
  const { gsap } = await import('gsap')
  return gsap
}
