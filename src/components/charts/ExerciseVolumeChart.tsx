import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { volumenJeSession } from '../../lib/analysis/training-charts'
import { VOLUMEN_JE_UEBUNG_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_MINT, achseProps, yAchseProps, gitterProps } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { useUebungsauswahl } from './useUebungsauswahl'
import { tooltipZahl } from '../../lib/zahl'

export const TITEL = VOLUMEN_JE_UEBUNG_TITEL

export default function ExerciseVolumeChart({
  sessions,
  sets,
  picker,
  leerCta,
  mitUebungsauswahl = true,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
  mitUebungsauswahl?: boolean
}) {
  const { optionen, exerciseId, waehlen } = useUebungsauswahl(sets)
  const punkte = exerciseId
    ? volumenJeSession(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []
  const uebungsName = optionen.find((option) => option.exercise_id === exerciseId)?.name
  const titel = mitUebungsauswahl || uebungsName == null ? TITEL : `${TITEL} – ${uebungsName}`

  return (
    <ChartFrame
      titel={titel}
      leer={punkte.length < 1}
      picker={picker}
      leerCta={leerCta}
      vorspann={
        mitUebungsauswahl && (
          <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={waehlen} />
        )
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          <YAxis {...yAchseProps} />
          <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kg`, 'Volumen']} />
          <Bar dataKey="wert" fill={CHART_MINT} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
