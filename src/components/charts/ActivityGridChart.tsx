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
  // One row per weekday, one column per week: the first day starts in its own
  // weekday row, so every row really is Monday … Sunday.
  const versatz = raster.length > 0 ? (new Date(`${raster[0].datum}T12:00:00`).getDay() + 6) % 7 : 0
  const trainingstage = raster.filter((tag) => tag.status === 'trainingstag').length
  const zusammenfassung = `${trainingstage} ${trainingstage === 1 ? 'Trainingstag' : 'Trainingstage'} in ${raster.length} Tagen`

  return (
    <ChartFrame titel={TITEL} leer={raster.length < 1} picker={picker} zusammenfassung={zusammenfassung}>
      <div className="flex gap-2">
        <ul aria-hidden="true" className="grid grid-rows-7 gap-1 text-[10px] leading-3.5 text-text-muted">
          {WOCHENTAGE.map((tag, index) => (
            <li key={index} className="h-3.5">
              {tag}
            </li>
          ))}
        </ul>
        <ul
          role="list"
          className="grid grid-flow-col grid-rows-7 auto-cols-max gap-1 overflow-x-auto"
          data-testid="aktivitaetsraster"
        >
          {Array.from({ length: versatz }, (_, index) => (
            <li key={`leer-${index}`} aria-hidden="true" className="size-3.5" />
          ))}
          {raster.map((tag) => (
            <li key={tag.datum}>
              <div
                className={`size-3.5 rounded-sm ${
                  tag.status === 'trainingstag' ? 'bg-chart-mint' : 'bg-surface border border-text-muted/40'
                }`}
                title={tag.datum}
                data-status={tag.status}
              />
            </li>
          ))}
        </ul>
      </div>
    </ChartFrame>
  )
}

/** Row labels; every other one, the rest stay blank so the column does not read as a list. */
const WOCHENTAGE = ['Mo', '', 'Mi', '', 'Fr', '', 'So']
