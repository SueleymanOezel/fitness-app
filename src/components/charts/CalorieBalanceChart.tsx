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
import { kalorienbilanz } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry, AnalysisSessionKalorien } from '../../hooks/use-nutrition-analysis'
import { KALORIENBILANZ_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIENBILANZ_TITEL

export default function CalorieBalanceChart({
  entries,
  sessions,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  picker?: ReactNode
}) {
  const punkte = kalorienbilanz(entries, sessions).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Bilanz']} />
          <ReferenceLine y={0} stroke="#999" />
          <Line type="monotone" dataKey="bilanz" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
