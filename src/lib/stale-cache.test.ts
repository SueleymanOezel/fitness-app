import { afterEach, describe, expect, it, vi } from 'vitest'
import { cacheLeeren, cacheLesen, cacheSchreiben } from './stale-cache'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('stale-cache', () => {
  it('returns what was written, per user and name', () => {
    cacheSchreiben('u1', 'plans', [{ id: 'p1' }])

    expect(cacheLesen('u1', 'plans')).toEqual([{ id: 'p1' }])
    expect(cacheLesen('u2', 'plans')).toBeUndefined()
    expect(cacheLesen('u1', 'other')).toBeUndefined()
  })

  it('keeps a null value distinguishable from "nothing stored"', () => {
    cacheSchreiben('u1', 'profile', null)
    expect(cacheLesen('u1', 'profile')).toBeNull()
    expect(cacheLesen('u1', 'never')).toBeUndefined()
  })

  it('treats unreadable content as nothing stored', () => {
    localStorage.setItem('vl-cache:u1:plans', '{kaputt')
    expect(cacheLesen('u1', 'plans')).toBeUndefined()
  })

  it('replaces older variants of the same base, so one key per day does not pile up', () => {
    cacheSchreiben('u1', 'food-entries@2026-10-17', ['gestern'])
    cacheSchreiben('u2', 'food-entries@2026-10-17', ['anderer nutzer'])
    cacheSchreiben('u1', 'food-entries@2026-10-18', ['heute'])

    expect(cacheLesen('u1', 'food-entries@2026-10-17')).toBeUndefined()
    expect(cacheLesen('u1', 'food-entries@2026-10-18')).toEqual(['heute'])
    expect(cacheLesen('u2', 'food-entries@2026-10-17')).toEqual(['anderer nutzer'])
  })

  it('clears every cached copy but leaves other storage alone', () => {
    cacheSchreiben('u1', 'plans', [1])
    cacheSchreiben('u2', 'profile', { a: 1 })
    localStorage.setItem('sb-auth-token', 'bleibt')

    cacheLeeren()

    expect(cacheLesen('u1', 'plans')).toBeUndefined()
    expect(cacheLesen('u2', 'profile')).toBeUndefined()
    expect(localStorage.getItem('sb-auth-token')).toBe('bleibt')
  })

  it('does not throw when the storage is full or blocked', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(() => cacheSchreiben('u1', 'plans', [1])).not.toThrow()
    expect(cacheLesen('u1', 'plans')).toBeUndefined()
    expect(() => cacheLeeren()).not.toThrow()
  })
})
