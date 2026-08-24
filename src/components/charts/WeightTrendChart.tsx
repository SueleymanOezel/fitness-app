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
import ChartFrame from './ChartFrame'

export const TITEL = GEWICHTSVERLAUF_TITEL

function tagesLabel(datum: string) {
  const [, monat, tag] = datum.split('-')
  return `${tag}.${monat}.`
}

export default function WeightTrendChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = gewichtsTrend(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* The interesting range is a few kilos wide; a zero-based axis would
              flatten every change into a straight line. */}
          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(wert: number) => wert.toFixed(1)} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, '']} />
          <Line type="monotone" dataKey="gewicht" name="Gewicht" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="trend" name="Trend" stroke="#82ca9d" strokeWidth={2} dot={false} />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
