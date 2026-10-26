import type { ReactNode } from 'react'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { persoenlicheRekorde } from '../../lib/analysis/training-charts'
import { REKORDE_TITEL } from '../../lib/analysis/chart-titles'
import { datumsLabel } from '../../lib/analysis/tages-label'
import { listClass, listRowClass } from '../../lib/ui-classes'
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
  leerCta,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const rekorde = persoenlicheRekorde(sessions, sets)

  return (
    <ChartFrame titel={TITEL} hilfe="einsRM" leer={rekorde.length < 1} leerHinweis="Erscheint nach dem ersten Training mit Gewicht." picker={picker} leerCta={leerCta}>
      <ul role="list" className={listClass}>
        {rekorde.map((rekord) => (
          <li key={rekord.exercise_id} className={listRowClass}>
            <strong>{rekord.name}</strong>{' '}
            {rekord.art === 'wiederholungen'
              ? `${rekord.wiederholungen} Wdh. mit Körpergewicht am ${datumsLabel(rekord.tag)}`
              : `≈ ${zahl(rekord.einsRM)} kg geschätztes 1RM (${rekord.gewicht.toLocaleString('de-DE')} kg × ${rekord.wiederholungen}) am ${datumsLabel(rekord.tag)}`}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
