import type { ReactNode } from 'react'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import { gewichtsTrend } from '../../lib/analysis/body-charts'
import { kalorienJeTag } from '../../lib/analysis/nutrition-charts'
import { TRENDS_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_BLUE, CHART_MINT } from '../../lib/analysis/chart-colors'
import { zahlDe } from '../../lib/zahl'
import ChartFrame from './ChartFrame'

export const TITEL = TRENDS_TITEL

/**
 * H3 ist der einzige Home-Graph mit Recharts: zwei minimale Linien ohne
 * Achsen, Gitter oder Tooltip — rein "auf einen Blick", deshalb auch der
 * einzige mit Design-Farben (Gewicht Blau, Kalorien Mint — dieselbe
 * Zuordnung wie K1, hier zwei gleichrangige Metriken statt Haupt-/
 * Vergleichslinie).
 */
export default function HomeSparklines({
  rows,
  entries,
  picker,
}: {
  rows: { datum: string; gewicht: number | null }[]
  entries: { zeitpunkt: string; menge: number; products: { kalorien: number } | null }[]
  picker?: ReactNode
}) {
  const gewicht = gewichtsTrend(rows)
  const kalorien = kalorienJeTag(entries)
  const gewichtJetzt = gewicht.length > 0 ? gewicht[gewicht.length - 1].trend : null
  const kalorienSchnitt =
    kalorien.length > 0 ? Math.round(kalorien.reduce((summe, tag) => summe + tag.kalorien, 0) / kalorien.length) : null

  return (
    <ChartFrame titel={TITEL} leer={gewicht.length < 2 && kalorien.length < 2} picker={picker}>
      {/* Each line names what it is and where it stands; a bare squiggle says nothing. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <p className="flex flex-col text-sm text-text-muted">
          Gewicht (Trend)
          <span className="text-base font-semibold text-text tabular-nums">
            {gewichtJetzt == null ? '—' : `${zahlDe(gewichtJetzt, 1)} kg`}
          </span>
        </p>
        <p className="flex flex-col text-sm text-text-muted">
          Kalorien pro Tag
          <span className="text-base font-semibold text-text tabular-nums">
            {kalorienSchnitt == null ? '—' : `Ø ${kalorienSchnitt} kcal`}
          </span>
        </p>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={gewicht}>
            <Line
              type="monotone"
              dataKey="trend"
              stroke={CHART_BLUE}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={60}>
          <LineChart data={kalorien}>
            <Line
              type="monotone"
              dataKey="kalorien"
              stroke={CHART_MINT}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  )
}
