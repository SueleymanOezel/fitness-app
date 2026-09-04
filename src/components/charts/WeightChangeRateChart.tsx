import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { aenderungsrate } from '../../lib/analysis/body-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { AENDERUNGSRATE_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = AENDERUNGSRATE_TITEL

export default function WeightChangeRateChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = aenderungsrate(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(wert: number) => wert.toFixed(1)} />
          {/* extendDomain: sonst verwirft Recharts die Linie, sobald alle Raten
              auf derselben Seite der Null liegen — also genau dann, wenn die
              Null die Aussage des Graphen traegt. */}
          <ReferenceLine y={0} stroke="#888" ifOverflow="extendDomain" />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg/Woche`, '']} />
          <Line type="monotone" dataKey="rate" name="kg/Woche" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
