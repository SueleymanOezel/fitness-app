import type { ReactNode } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { AnalysisSession, AnalysisSet } from '../../hooks/use-training-analysis'
import { wiederholungenJeSatz } from '../../lib/analysis/training-charts'
import { WIEDERHOLUNGEN_JE_SATZ_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { useUebungsauswahl } from './useUebungsauswahl'

export const TITEL = WIEDERHOLUNGEN_JE_SATZ_TITEL

// Sechs Farben reichen: mehr als sechs Arbeitssaetze je Uebung ist selten, und
// danach wiederholt sich die Reihe, statt dass eine Linie unsichtbar wird.
const FARBEN = ['#8884d8', '#82ca9d', '#ffc658', '#ff7f7f', '#8dd1e1', '#a4de6c']

export default function RepsPerSetChart({
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
  const reihen = exerciseId
    ? wiederholungenJeSatz(sessions, sets, exerciseId)
    : { punkte: [], satzNummern: [] }
  const punkte = reihen.punkte.map((punkt) => ({ ...punkt, label: tagesLabel(punkt.tag) }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      {mitUebungsauswahl && (
        <ExerciseSelect optionen={optionen} wert={exerciseId} onChange={waehlen} />
      )}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* allowDecimals: halbe Wiederholungen gibt es nicht. */}
          <YAxis allowDecimals={false} />
          <Tooltip />
          {reihen.satzNummern.map((nummer, index) => (
            <Line
              key={nummer}
              type="monotone"
              dataKey={`satz${nummer}`}
              name={`Satz ${nummer}`}
              stroke={FARBEN[index % FARBEN.length]}
              // connectNulls bleibt aus: eine Luecke ist ein nicht gemachter
              // Satz und soll als Luecke sichtbar bleiben.
              dot={false}
            />
          ))}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
