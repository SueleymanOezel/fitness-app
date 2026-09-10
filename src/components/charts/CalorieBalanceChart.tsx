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
import { CHART_GRID, CHART_MINT } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = KALORIENBILANZ_TITEL

export default function CalorieBalanceChart({
  entries,
  sessions,
  picker,
  leerCta,
}: {
  entries: AnalysisFoodEntry[]
  sessions: AnalysisSessionKalorien[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = kalorienbilanz(entries, sessions).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.tag),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Bilanz']} />
          <ReferenceLine y={0} stroke={CHART_GRID} />
          <Line type="monotone" dataKey="bilanz" stroke={CHART_MINT} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
