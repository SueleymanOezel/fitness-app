import type { ReactNode } from 'react'
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { gewichtGegenKalorien } from '../../lib/analysis/body-charts'
import type { TagesPunkt } from '../../lib/analysis/nutrition-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { GEWICHT_UEBER_KALORIEN_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = GEWICHT_UEBER_KALORIEN_TITEL

/**
 * K4 traegt zwei Groessen gegeneinander auf, nicht gegen die Zeit: auf einer
 * Zeitachse waeren das zwei Linien, deren Zusammenhang man raten muss. In der
 * Punktwolke liest man ihn ab — und dort, wo sie die Nulllinie schneidet, liegt
 * ungefaehr der Erhaltungsbedarf.
 */
export default function WeightVsCaloriesChart({
  rows,
  kalorien,
  picker,
}: {
  rows: BodyMetricRow[]
  kalorien: TagesPunkt[]
  picker?: ReactNode
}) {
  const punkte = gewichtGegenKalorien(rows, kalorien)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="kalorien"
            name="kcal je Tag"
            unit=" kcal"
            domain={['dataMin - 100', 'dataMax + 100']}
          />
          <YAxis type="number" dataKey="aenderung" name="kg je Woche" unit=" kg" />
          {/* extendDomain: sonst verwirft Recharts die Linie, sobald alle Wochen
              auf derselben Seite der Null liegen. */}
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Woche" data={punkte} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
