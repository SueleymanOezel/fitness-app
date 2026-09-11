/**
 * Maps the 17 raw muskelgruppen_primaer/sekundaer values (see
 * muscle-group-labels.ts) onto 10 simplified body zones for the training-day
 * muscle silhouette — a "vereinfachtes Diagramm" was the deliberate choice
 * over one region per raw value (see the brainstorming for this feature).
 */
export const ALLE_ZONEN = [
  'schultern',
  'brust',
  'arme',
  'bauch',
  'beineVorne',
  'nackenTrapez',
  'ruecken',
  'trizeps',
  'gesaess',
  'beineHinten',
] as const

export type MuskelZone = (typeof ALLE_ZONEN)[number]

const ZONE_FUER_MUSKELGRUPPE: Record<string, MuskelZone> = {
  shoulders: 'schultern',
  chest: 'brust',
  biceps: 'arme',
  forearms: 'arme',
  abdominals: 'bauch',
  quadriceps: 'beineVorne',
  adductors: 'beineVorne',
  abductors: 'beineVorne',
  neck: 'nackenTrapez',
  traps: 'nackenTrapez',
  lats: 'ruecken',
  'middle back': 'ruecken',
  'lower back': 'ruecken',
  triceps: 'trizeps',
  glutes: 'gesaess',
  hamstrings: 'beineHinten',
  calves: 'beineHinten',
}

export type ZonenStatus = 'primary' | 'secondary' | null

/**
 * Primary always wins over secondary, regardless of exercise order in the
 * day — two passes so a later exercise's secondary hit never downgrades an
 * earlier one's primary hit on the same zone.
 */
export function zonenFuerTag(
  exercises: { muskelgruppen_primaer: string[] | null; muskelgruppen_sekundaer: string[] | null }[],
): Record<MuskelZone, ZonenStatus> {
  const zonen = Object.fromEntries(ALLE_ZONEN.map((zone) => [zone, null])) as Record<MuskelZone, ZonenStatus>

  for (const exercise of exercises) {
    for (const wert of exercise.muskelgruppen_primaer ?? []) {
      const zone = ZONE_FUER_MUSKELGRUPPE[wert]
      if (zone) zonen[zone] = 'primary'
    }
  }
  for (const exercise of exercises) {
    for (const wert of exercise.muskelgruppen_sekundaer ?? []) {
      const zone = ZONE_FUER_MUSKELGRUPPE[wert]
      if (zone && zonen[zone] !== 'primary') zonen[zone] = 'secondary'
    }
  }
  return zonen
}
