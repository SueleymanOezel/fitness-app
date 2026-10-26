import { describe, expect, it } from 'vitest'
import { seitenTitel } from './page-title'

describe('seitenTitel', () => {
  it.each([
    ['/', 'Home · VitaLoop'],
    ['/training', 'Training · VitaLoop'],
    ['/training/plans/abc', 'Plan bearbeiten · VitaLoop'],
    ['/training/plans/new', 'Neuer Plan · VitaLoop'],
    ['/training/session/s4', 'Training läuft · VitaLoop'],
    ['/training/history/abc', 'Trainingseinheit · VitaLoop'],
    ['/body/photos', 'Fortschrittsfotos · VitaLoop'],
    ['/profile/konto-loeschen', 'Konto löschen · VitaLoop'],
    ['/profile/hilfe', 'Hilfe · VitaLoop'],
    ['/gibt-es-nicht', 'Seite nicht gefunden · VitaLoop'],
  ])('%s → %s', (pfad, titel) => {
    expect(seitenTitel(pfad)).toBe(titel)
  })
})
