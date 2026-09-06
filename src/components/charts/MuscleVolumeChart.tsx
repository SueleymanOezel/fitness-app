import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { volumenJeMuskelgruppe } from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_MUSKELGRUPPE_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_PALETTE } from '../../lib/analysis/chart-colors'
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
          <Bar dataKey="volumen">
            {/* Reihenfolge nach erstem Auftreten in den Daten (Spec-Vorgabe),
                nicht nach Namen — volumenJeMuskelgruppe liefert diese Reihenfolge
                bereits, hier nur per Index eingefaerbt. */}
            {punkte.map((punkt, index) => (
              <Cell key={punkt.muskelgruppe} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
