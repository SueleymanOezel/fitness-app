import { useState, type ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import {
  haeufigsteUebung,
  uebungenImZeitraum,
  volumenJeSession,
} from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_UEBUNG_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'

export const TITEL = VOLUMEN_JE_UEBUNG_TITEL

export default function ExerciseVolumeChart({
  sessions,
  sets,
  picker,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  mitUebungsauswahl?: boolean
}) {
  const optionen = uebungenImZeitraum(sets)
  const [gewaehlt, setGewaehlt] = useState<string | null>(null)
  const exerciseId = gewaehlt ?? haeufigsteUebung(sets)
  const punkte = exerciseId
    ? volumenJeSession(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={setGewaehlt} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'Volumen']} />
          <Bar dataKey="wert" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
