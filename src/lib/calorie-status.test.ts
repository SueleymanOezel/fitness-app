import { describe, expect, it } from 'vitest'
import { kalorienStatus } from './calorie-status'

describe('kalorienStatus', () => {
  it('zeigt Restkalorien, Ziel und den Anteil am Ziel', () => {
    const status = kalorienStatus(1360, 2000)
    expect(status.titel).toBe('640 kcal übrig')
    expect(status.untertitel).toBe('Ziel 2000 kcal · 1360 gegessen')
    expect(status.anteil).toBeCloseTo(0.68)
    expect(status.ringLabel).toBe('640 kcal übrig, Ziel 2000 kcal')
    expect(status.gegessen).toBe(1360)
  })

  it('meldet eine Überschreitung und begrenzt den Ring auf voll', () => {
    const status = kalorienStatus(2300, 2000)
    expect(status.titel).toBe('300 kcal drüber')
    expect(status.anteil).toBe(1)
  })

  it('zeigt ohne Ziel nur das Gegessene und einen leeren Ring', () => {
    const status = kalorienStatus(1360, null)
    expect(status.titel).toBe('1360 kcal gegessen')
    expect(status.untertitel).toBeNull()
    expect(status.anteil).toBe(0)
  })

  it('behandelt ein Ziel von 0 oder weniger wie kein Ziel', () => {
    expect(kalorienStatus(500, 0).titel).toBe('500 kcal gegessen')
    expect(kalorienStatus(500, -100).anteil).toBe(0)
  })

  it('rundet auf ganze kcal', () => {
    const status = kalorienStatus(1359.6, 2000)
    expect(status.gegessen).toBe(1360)
    expect(status.titel).toBe('640 kcal übrig')
  })

  it('beginnt ohne Einträge mit vollem Ziel und leerem Ring', () => {
    const status = kalorienStatus(0, 2000)
    expect(status.titel).toBe('2000 kcal übrig')
    expect(status.anteil).toBe(0)
  })
})
