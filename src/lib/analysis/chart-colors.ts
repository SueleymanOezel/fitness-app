import { zahlDe } from '../zahl'

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
/** --color-text-muted: 5:1 on a card. Recharts' default tick color #666 is 2.7:1. */
export const CHART_TEXT = '#90919a'

/** Every cartesian axis: muted ticks, no axis or tick lines — the data carries the ink, not the frame. */
export const achseProps = { tick: { fill: CHART_TEXT, fontSize: 12 }, axisLine: false, tickLine: false }
/** Y axes also write numbers the German way ("83,5", not "83.5"); two places so steps like 0,15 stay even. */
export const yAchseProps = { ...achseProps, tickFormatter: (wert: number) => zahlDe(wert, 2) }
/** Kilo axes that do not start at zero: whole-number bounds and ticks, so the scale reads 82 · 83 · 84, not 82,15 · 82,9. */
export const ganzzahligeAchse = {
  domain: [(min: number) => Math.floor(min), (max: number) => Math.ceil(max)] as [(min: number) => number, (max: number) => number],
  allowDecimals: false,
}

/** Horizontal guides only, and quiet. */
export const gitterProps = { stroke: CHART_GRID, strokeDasharray: '3 3', vertical: false, strokeOpacity: 0.6 }

/**
 * One color per area, so a chart says where it belongs at a glance: training
 * stays mint, nutrition orange, body violet (the brand's lilac). Multi-series
 * charts keep their own legends.
 */
export const BEREICH_FARBE = { training: CHART_MINT, ernaehrung: CHART_ORANGE, koerper: CHART_VIOLET } as const

/**
 * Nutrition's three macros share one chart, so they stay in the orange family
 * and differ by lightness (relative luminance in brackets), which still parts
 * them for color-blind eyes; each keeps its label. All ≥3:1 on a card (contrast.test.ts).
 */
export const ORANGE_TOENE = { kern: CHART_ORANGE /* 0.33 */, amber: '#ffb347' /* 0.54 */, sand: '#ffdcb0' /* 0.76 */ } as const

/** Fixed cycle for charts with more categories than dedicated colors (T6, E4). */
export const CHART_PALETTE = [CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET]
