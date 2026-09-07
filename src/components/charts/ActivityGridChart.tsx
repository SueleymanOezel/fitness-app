import type { ReactNode } from 'react'
import { aktivitaetsraster } from '../../lib/analysis/home-charts'
import { AKTIVITAETSRASTER_TITEL } from '../../lib/analysis/chart-titles'
import { rangeStart, type Zeitraum } from '../../lib/analysis/zeitraum'
import { localDay } from '../../lib/local-time'
import ChartFrame from './ChartFrame'

export const TITEL = AKTIVITAETSRASTER_TITEL

/**
 * H1 ist bewusst kein Recharts-Graph: ein Feld je Kalendertag ist ein
 * CSS-Grid, kein Koordinatensystem — genauso wie T8/K5 schon ohne Recharts
 * auskommen. `zeitraum` kommt als eigener Prop (nicht nur `sessions`), weil
 * das Raster auch Tage ohne jede Session als Restday zeichnen muss — die
 * gefilterten `sessions` allein verraten nicht, wo das Fenster beginnt.
 */
export default function ActivityGridChart({
  sessions,
  zeitraum,
  picker,
}: {
  sessions: { beendet_am: string | null }[]
  zeitraum: Zeitraum
  picker?: ReactNode
}) {
  const heute = localDay(new Date().toISOString())
  const raster = aktivitaetsraster(sessions, rangeStart(zeitraum), heute)

  return (
    <ChartFrame titel={TITEL} leer={raster.length < 1} picker={picker}>
      <ul role="list" className="grid grid-cols-7 gap-1" data-testid="aktivitaetsraster">
        {raster.map((tag) => (
          <li key={tag.datum} className="block border-b-0 p-0">
            <div
              className={`aspect-square rounded ${
                tag.status === 'trainingstag' ? 'bg-accent' : 'bg-surface border border-text-muted'
              }`}
              title={tag.datum}
              data-status={tag.status}
            />
          </li>
        ))}
      </ul>
    </ChartFrame>
  )
}
