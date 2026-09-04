import type { ReactNode } from 'react'
import type { AnalysisPhoto } from '../../hooks/use-body-analysis'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { fotoZeitleiste } from '../../lib/analysis/body-charts'
import { FOTOS_TITEL } from '../../lib/analysis/chart-titles'
import { datumsLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = FOTOS_TITEL

/** German notation: comma as the decimal mark, at most one place. */
function formatGewicht(wert: number) {
  return wert.toLocaleString('de-DE', { maximumFractionDigits: 1 })
}

/**
 * K5 ist wie T8 bewusst kein Diagramm: Fotos brauchen keine Achse. Diese
 * Komponente importiert deshalb kein Recharts.
 *
 * Nur das Darstellungsmuster stammt von `/body/photos` — Hochladen und Loeschen
 * gehoeren dorthin, nicht in einen Analysegraphen.
 */
export default function PhotoTimeline({
  fotos,
  rows,
  picker,
}: {
  fotos: AnalysisPhoto[]
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = fotoZeitleiste(fotos, rows)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ul role="list">
        {punkte.map((punkt) => (
          <li key={punkt.id}>
            <span>{datumsLabel(punkt.datum)}</span>
            <span>
              {punkt.gewicht == null
                ? 'kein Gewicht erfasst'
                : `${formatGewicht(punkt.gewicht)} kg`}
            </span>
            {punkt.url == null ? (
              // Ein signierter Link kann fuer sich scheitern; ein blankes <img>
              // zeigte nur ein kaputtes Bild und sagte nichts dazu.
              <span>Bild nicht verfügbar</span>
            ) : (
              <img
                src={punkt.url}
                alt={`Fortschrittsfoto vom ${datumsLabel(punkt.datum)}`}
                loading="lazy"
              />
            )}
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
