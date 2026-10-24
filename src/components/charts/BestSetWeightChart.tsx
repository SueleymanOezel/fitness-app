import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { bestesGewichtJeSession } from '../../lib/analysis/training-charts'
import { BESTES_SATZGEWICHT_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import { CHART_MINT, achseProps, yAchseProps, gitterProps, ganzzahligeAchse } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { useUebungsauswahl } from './useUebungsauswahl'
import { tooltipZahl } from '../../lib/zahl'

export const TITEL = BESTES_SATZGEWICHT_TITEL

export default function BestSetWeightChart({
  sessions,
  sets,
  picker,
  leerCta,
  mitUebungsauswahl = true,
  uebung,
}: {
  sessions: AnalysisSession[]
  sets: AnalysisSet[]
  picker?: ReactNode
  leerCta?: { label: string; to: string }
  mitUebungsauswahl?: boolean
  /** Set by the analysis page, which shares one exercise select across T2–T5; the chart then shows no select of its own. */
  uebung?: string | null
}) {
  const auswahl = useUebungsauswahl(sets)
  const { optionen, waehlen } = auswahl
  const exerciseId = uebung !== undefined ? uebung : auswahl.exerciseId
  const eigeneAuswahl = mitUebungsauswahl && uebung === undefined
  const punkte = exerciseId
    ? bestesGewichtJeSession(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []
  const uebungsName = optionen.find((option) => option.exercise_id === exerciseId)?.name
  const titel = eigeneAuswahl || uebungsName == null ? TITEL : `${TITEL} – ${uebungsName}`

  return (
    <ChartFrame
      titel={titel}
      leer={punkte.length < 2} leerHinweis="Erscheint ab zwei Trainings mit dieser Übung."
      picker={picker}
      leerCta={leerCta}
      vorspann={
        eigeneAuswahl && (
          <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={waehlen} />
        )
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid {...gitterProps} />
          <XAxis {...achseProps} dataKey="label" />
          <YAxis {...yAchseProps} {...ganzzahligeAchse} />
          <Tooltip formatter={(wert?: ValueType) => [`${tooltipZahl(wert)} kg`, 'bestes Satzgewicht']} />
          <Line type="monotone" dataKey="wert" stroke={CHART_MINT} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
