import type { ReactNode } from 'react'
import { wochenKurzform } from '../../lib/analysis/home-charts'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import { WOCHEN_KURZFORM_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = WOCHEN_KURZFORM_TITEL

/** U+2212 Minuszeichen statt Bindestrich, wie auf BodyPage — laeuft mit Ziffern fluchtend. */
function vorzeichen(wert: number) {
  return `${wert < 0 ? '−' : '+'}${Math.abs(wert)}`
}

/**
 * H2 ist bewusst kein Recharts-Graph: drei Kennzahlen je Woche als Zeile sind
 * eine Liste, genau wie T8 (Persoenliche Rekorde) schon ohne Recharts
 * auskommt.
 */
export default function WeeklySummaryList({
  sessions,
  entries,
  rows,
  picker,
}: {
  sessions: { beendet_am: string | null }[]
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]
  rows: { datum: string; gewicht: number | null }[]
  picker?: ReactNode
}) {
  const zeilen = wochenKurzform(sessions, kalorienJeTag(entries), rows)

  return (
    <ChartFrame titel={TITEL} leer={zeilen.length < 1} picker={picker}>
      <ul role="list">
        {zeilen.map((zeile) => (
          <li key={zeile.woche}>
            <strong>{zeile.woche}</strong>{' '}
            {`${zeile.trainingseinheiten} Trainingseinheiten`}
            {zeile.kalorienschnitt != null && ` · Ø ${zeile.kalorienschnitt} kcal`}
            {zeile.gewichtsAenderung != null && ` · ${vorzeichen(zeile.gewichtsAenderung)} kg`}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
