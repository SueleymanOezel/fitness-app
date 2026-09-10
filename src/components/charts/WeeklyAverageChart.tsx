import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { wochenschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { WOCHENSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_MINT } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'

export const TITEL = WOCHENSCHNITT_TITEL

export default function WeeklyAverageChart({
  entries,
  picker,
  leerCta,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = wochenschnitt(entries)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="woche" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Schnitt je Tag']} />
          <Bar dataKey="schnitt" fill={CHART_MINT} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
