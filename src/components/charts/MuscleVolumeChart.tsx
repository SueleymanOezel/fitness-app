import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { volumenJeMuskelgruppe } from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_MUSKELGRUPPE_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = VOLUMEN_JE_MUSKELGRUPPE_TITEL

export default function MuscleVolumeChart({
  sets,
  picker,
}: {
  sets: AnalysisSet[]
  picker?: ReactNode
}) {
  const punkte = volumenJeMuskelgruppe(sets)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="muskelgruppe" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'Volumen']} />
          <Bar dataKey="volumen" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
