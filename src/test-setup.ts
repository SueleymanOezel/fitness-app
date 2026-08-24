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

HTMLElement.prototype.getBoundingClientRect = function () {
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
