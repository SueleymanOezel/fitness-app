import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { gewichtsTrend } from '../../lib/analysis/body-charts'
import type { BodyMetricRow } from '../../lib/body-metrics'
import { GEWICHTSVERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_BLUE, CHART_MINT } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = GEWICHTSVERLAUF_TITEL

export default function WeightTrendChart({
  rows,
  picker,
  leerCta,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = gewichtsTrend(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* The interesting range is a few kilos wide; a zero-based axis would
              flatten every change into a straight line. */}
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(wert: number) => wert.toFixed(1)} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, '']} />
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke={CHART_BLUE} dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke={CHART_MINT} strokeWidth={2} dot={false} />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
