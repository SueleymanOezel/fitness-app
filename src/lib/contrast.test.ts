import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('gives the maximum ratio for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1)
  })

  it('gives a ratio of 1 for identical colors', () => {
    expect(contrastRatio('#5e5f66', '#5e5f66')).toBeCloseTo(1, 5)
  })

  it('is symmetric regardless of argument order', () => {
    expect(contrastRatio('#181920', '#8766ed')).toBeCloseTo(contrastRatio('#8766ed', '#181920'), 5)
  })

  // Die drei tatsaechlichen Token-Paare aus der Spec (docs/superpowers/specs/2026-09-06-phase6-nachschaerfung-design.md).
  // Diese Hex-Werte spiegeln src/index.css direkt (wie chart-colors.ts es fuer die Chart-Farben schon tut) —
  // Vitest kann eine CSS-Custom-Property nicht importieren, daher hier bewusst als Literal dupliziert.
  const BG = '#181920'
  const SURFACE = '#23242b'
  const SURFACE_RAISED = '#414249'
  const ACCENT = '#8766ed'
  const ACCENT_TEXT = '#a288f1'
  const DANGER = '#f27a6b'

  it('confirms the old text-muted value FAILS AA text contrast against surface', () => {
    expect(contrastRatio('#5e5f66', SURFACE)).toBeLessThan(4.5)
  })

  it('confirms the new text-muted value clears AA text contrast against bg and surface', () => {
    expect(contrastRatio('#90919a', BG)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#90919a', SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it('confirms the new text-muted value clears the 3:1 UI-component minimum against the nav pill', () => {
    expect(contrastRatio('#90919a', SURFACE_RAISED)).toBeGreaterThanOrEqual(3)
  })

  it('confirms the old white-on-accent pairing FAILS AA text contrast', () => {
    expect(contrastRatio('#fefeff', ACCENT)).toBeLessThan(4.5)
  })

  it('confirms the new on-bright value clears AA text contrast on both accent and danger', () => {
    expect(contrastRatio('#0d0e12', ACCENT)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#0d0e12', DANGER)).toBeGreaterThanOrEqual(4.5)
  })

  it('confirms the old accent value FAILS as a text/icon foreground color (P2 critique)', () => {
    expect(contrastRatio(ACCENT, SURFACE)).toBeLessThan(4.5)
    expect(contrastRatio(ACCENT, SURFACE_RAISED)).toBeLessThan(3)
  })

  it('confirms the new accent-text value clears AA text contrast for links on bg and surface', () => {
    expect(contrastRatio(ACCENT_TEXT, BG)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(ACCENT_TEXT, SURFACE)).toBeGreaterThanOrEqual(4.5)
  })

  it('confirms the new accent-text value clears the 3:1 UI-component minimum against the nav pill', () => {
    expect(contrastRatio(ACCENT_TEXT, SURFACE_RAISED)).toBeGreaterThanOrEqual(3)
  })
})
