import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// Recharts' ResponsiveContainer measures its parent through ResizeObserver and
// getBoundingClientRect(). jsdom implements neither realistically (no observer
// at all, and getBoundingClientRect always returns zeros), so every chart
// would render an empty SVG and every chart test would pass without asserting
// anything. A fixed rect makes the charts draw.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// Only the ResponsiveContainer's own wrapper gets a fixed size: it is what
// ResizeObserver/getBoundingClientRect are read from to size the SVG.
// Everything else — most importantly a chart Legend's wrapper — must keep
// jsdom's native zero rect. Recharts feeds a Legend's measured box straight
// into the chart's plot-area offset (appendOffsetOfLegend in ChartUtils.js);
// a blanket 800x400 here previously made every legend consume more height
// than the 240px chart itself, leaving zero room for any Line to draw a path
// — a silent failure (no thrown error) discovered while building K1's
// two-line chart.
const nativeGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect
HTMLElement.prototype.getBoundingClientRect = function () {
  if (this.classList.contains('recharts-responsive-container')) {
    return {
      width: 800,
      height: 400,
      top: 0,
      left: 0,
      right: 800,
      bottom: 400,
      x: 0,
      y: 0,
      toJSON() {},
    } as DOMRect
  }
  return nativeGetBoundingClientRect.call(this)
}
