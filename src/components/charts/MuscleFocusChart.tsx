import type { ReactNode } from 'react'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { ALLE_ZONEN, haeufigkeitJeZone, type MuskelZone } from '../../lib/muscle-zones'
import { HINTEN, MuskelSilhouetteFigur, VORNE } from '../MuskelSilhouetteFigur'
import { FOKUS_JE_MUSKELGRUPPE_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = FOKUS_JE_MUSKELGRUPPE_TITEL

/** Untere Grenze der Deckkraft, damit eine wenig trainierte Zone (>0) noch
 * sichtbar von einer komplett unbenutzten Zone unterschieden werden kann. */
const MIN_OPACITY = 0.15

export default function MuscleFocusChart({
  sets,
  picker,
  leerCta,
}: {
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const haeufigkeit = haeufigkeitJeZone(sets)
  const max = Math.max(...ALLE_ZONEN.map((zone) => haeufigkeit[zone]))

  function stilFuerZone(zone: MuskelZone): { fill: string; fillOpacity: number } {
    const anzahl = haeufigkeit[zone]
    if (anzahl === 0) return { fill: 'var(--color-surface-raised)', fillOpacity: 1 }
    return { fill: 'var(--color-accent-text)', fillOpacity: MIN_OPACITY + (1 - MIN_OPACITY) * (anzahl / max) }
  }

  return (
    <ChartFrame titel={TITEL} leer={max === 0} picker={picker} leerCta={leerCta}>
      <div className="flex gap-4">
        <MuskelSilhouetteFigur
          gruppen={VORNE}
          titel="Trainingsfokus über die Historie, Vorderansicht"
          stilFuerZone={stilFuerZone}
          datenLevel={(zone) => String(haeufigkeit[zone])}
        />
        <MuskelSilhouetteFigur
          gruppen={HINTEN}
          titel="Trainingsfokus über die Historie, Rückansicht"
          stilFuerZone={stilFuerZone}
          datenLevel={(zone) => String(haeufigkeit[zone])}
        />
      </div>
    </ChartFrame>
  )
}
