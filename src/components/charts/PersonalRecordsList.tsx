import type { ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { persoenlicheRekorde } from '../../lib/analysis/training-charts'
import { REKORDE_TITEL } from '../../lib/analysis/chart-titles'
import { datumsLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = REKORDE_TITEL

/** Eine Zahl mit einer Nachkommastelle, deutsch geschrieben. */
function zahl(wert: number) {
  return wert.toFixed(1).replace('.', ',')
}

/**
 * T8 ist bewusst kein Diagramm: acht Uebungen mit je einer Zahl sind eine
 * Liste. Diese Komponente importiert deshalb kein Recharts.
 */
export default function PersonalRecordsList({
  sessions,
  sets,
  picker,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
}) {
  const rekorde = persoenlicheRekorde(sessions, sets)

  return (
    <ChartFrame titel={TITEL} leer={rekorde.length < 1} picker={picker}>
      <ul role="list">
        {rekorde.map((rekord) => (
          <li key={rekord.exercise_id}>
            <strong>{rekord.name}</strong>{' '}
            {`${zahl(rekord.einsRM)} kg (${rekord.gewicht} kg × ${rekord.wiederholungen}) am ${datumsLabel(rekord.tag)}`}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
