/**
 * Named chart colors from the Phase 6 design spec
 * (docs/superpowers/specs/2026-09-05-phase6-design-design.md, section
 * "Farbzuordnung für alle 19 Graphen"). Recharts' fill/stroke props are SVG
 * presentation attributes and render more reliably as literal hex strings
 * than as CSS custom properties there, so these mirror src/index.css's
 * @theme values directly rather than referencing them via var(...).
 */
export const CHART_MINT = '#6efde6'
export const CHART_BLUE = '#4f6ca5'
export const CHART_GREEN = '#49be69'
export const CHART_ORANGE = '#ff6f43'
export const CHART_VIOLET = '#8766ed'
export const CHART_GRID = '#5e5f66'

/** Fixed cycle for charts with more categories than dedicated colors (T6, E4). */
export const CHART_PALETTE = [CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET]
