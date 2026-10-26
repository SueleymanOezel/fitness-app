export type KalorienStatus = {
  /** Gerundete gegessene kcal. */
  gegessen: number
  titel: string
  untertitel: string | null
  /** 0–1, Anteil des Ziels; ohne Ziel immer 0. */
  anteil: number
  ringLabel: string
}

/**
 * Gemeinsame Sprachregelung für Home und Ernährung. Ein Ziel ≤ 0 gilt als
 * „kein Ziel“, damit der Ring nie durch 0 teilt oder negativ läuft.
 */
export function kalorienStatus(verbrauchtExakt: number, ziel: number | null, trainingKcal = 0): KalorienStatus {
  const gegessen = Math.round(verbrauchtExakt)
  if (ziel == null || !(ziel > 0)) {
    return {
      gegessen,
      titel: `${gegessen} kcal gegessen`,
      untertitel: null,
      anteil: 0,
      ringLabel: `${gegessen} kcal gegessen, kein Ziel gesetzt`,
    }
  }
  const zielGerundet = Math.round(ziel)
  const uebrig = zielGerundet - gegessen
  const titel = uebrig >= 0 ? `${uebrig} kcal übrig` : `${-uebrig} kcal drüber`
  return {
    gegessen,
    titel,
    // Training raised today's goal: said on the card itself, not only in the folded breakdown.
    untertitel:
      trainingKcal > 0
        ? `Ziel ${zielGerundet} kcal inkl. ${Math.round(trainingKcal)} Training · ${gegessen} gegessen`
        : `Ziel ${zielGerundet} kcal · ${gegessen} gegessen`,
    anteil: Math.min(1, Math.max(0, verbrauchtExakt / ziel)),
    ringLabel: `${titel}, Ziel ${zielGerundet} kcal`,
  }
}
