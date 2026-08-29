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
import { kraftverlauf } from '../../lib/analysis/training-charts'
import { KRAFTVERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { useUebungsauswahl } from './useUebungsauswahl'

export const TITEL = KRAFTVERLAUF_TITEL

export default function StrengthChart({
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
  const { optionen, exerciseId, waehlen } = useUebungsauswahl(sets)
  const punkte = exerciseId
    ? kraftverlauf(sessions, sets, exerciseId).map((punkt) => ({
        ...punkt,
        label: tagesLabel(punkt.tag),
      }))
    : []
  const uebungsName = optionen.find((option) => option.exercise_id === exerciseId)?.name
  const titel = mitUebungsauswahl || uebungsName == null ? TITEL : `${TITEL} – ${uebungsName}`

  return (
    <ChartFrame
      titel={titel}
      leer={punkte.length < 2}
      picker={picker}
      vorspann={
        mitUebungsauswahl && (
          <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={waehlen} />
        )
      }
    >
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Nicht bei null beginnen: die interessante Spanne sind ein paar
              Kilo, eine Achse ab 0 macht daraus eine Gerade. */}
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert} kg`, 'geschätztes 1RM']} />
          <Line type="monotone" dataKey="wert" stroke="#8884d8" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
