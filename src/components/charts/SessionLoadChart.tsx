import type { ReactNode } from 'react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import { dauerUndKalorien } from '../../lib/analysis/training-charts'
import { DAUER_UND_KALORIEN_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = DAUER_UND_KALORIEN_TITEL

export default function SessionLoadChart({
  sessions,
  picker,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
}) {
  const punkte = dauerUndKalorien(sessions).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Zwei Achsen: Minuten und Kilokalorien liegen um eine Zehnerpotenz
              auseinander, auf einer Achse waere die Dauer ein flacher Strich. */}
          <YAxis yAxisId="minuten" />
          <YAxis yAxisId="kalorien" orientation="right" />
          <Tooltip />
          <Bar yAxisId="minuten" dataKey="minuten" name="Minuten" fill="#8884d8" />
          <Line
            yAxisId="kalorien"
            type="monotone"
            dataKey="kalorien"
            name="kcal"
            stroke="#82ca9d"
            dot={false}
          />
          <Legend />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
