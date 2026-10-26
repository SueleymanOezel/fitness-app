import { describe, expect, it } from 'vitest'
import { parentRoute } from './parent-route'

describe('parentRoute', () => {
  it.each([
    ['/training/plans', '/training'],
    ['/training/plans/abc', '/training/plans'],
    ['/training/plans/new', '/training/plans'],
    ['/training/history/abc', '/training/history'],
    ['/training/session/abc', '/training'],
    ['/nutrition/entries', '/nutrition'],
    ['/body/photos', '/body'],
    ['/home/analyse', '/'],
    ['/profile', '/'],
    ['/profile/konto-loeschen', '/profile'],
    ['/profile/hilfe', '/profile'],
  ])('%s leads back to %s', (pfad, ziel) => {
    expect(parentRoute(pfad)?.to).toBe(ziel)
  })

  it('has no parent on the top-level screens', () => {
    for (const pfad of ['/', '/training', '/nutrition', '/body']) expect(parentRoute(pfad)).toBeNull()
  })
})
