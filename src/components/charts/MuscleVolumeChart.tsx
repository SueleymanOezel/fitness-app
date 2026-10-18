import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSet } from '../../hooks/use-training-analysis'
import { volumenJeMuskelgruppe } from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_MUSKELGRUPPE_TITEL } from '../../lib/analysis/chart-titles'
import { CHART_PALETTE, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import { muskelgruppeLabel } from '../../lib/muscle-group-labels'
import ChartFrame from './ChartFrame'
import { tooltipZahl } from '../../lib/zahl'

export const TITEL = VOLUMEN_JE_MUSKELGRUPPE_TITEL

export default function MuscleVolumeChart({
  sets,
  picker,
  leerCta,
}: {
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
}) {
  const punkte = volumenJeMuskelgruppe(sets)

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker} leerCta={leerCta}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="muskelgruppe" tickFormatter={muskelgruppeLabel} />
          <YAxis {...yAchseProps} />
          <Tooltip
            formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kg`, 'Volumen']}
            labelFormatter={(muskelgruppe) => (typeof muskelgruppe === 'string' ? muskelgruppeLabel(muskelgruppe) : muskelgruppe)}
          />
          <Bar dataKey="volumen" fill={CHART_PALETTE[0]}>
            {/* Keine feste Bedeutung je Position (anders als E2) — nur "gut
                unterscheidbar". volumenJeMuskelgruppe sortiert nach Volumen
                absteigend, die Farbe je Balken folgt dieser Reihenfolge per
                Index und kann sich deshalb zwischen Zeitraeumen aendern. */}
            {punkte.map((punkt, index) => (
              <Cell key={punkt.muskelgruppe} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
