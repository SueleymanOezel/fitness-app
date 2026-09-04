import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { wochenschnitt } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { WOCHENSCHNITT_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = WOCHENSCHNITT_TITEL

export default function WeeklyAverageChart({
  entries,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
}) {
  const punkte = wochenschnitt(entries)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="woche" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kcal`, 'Schnitt je Tag']} />
          <Bar dataKey="schnitt" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
