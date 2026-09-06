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
import { CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET } from '../../lib/analysis/chart-colors'
import ChartFrame from './ChartFrame'
import ExerciseSelect from './ExerciseSelect'
import { useUebungsauswahl } from './useUebungsauswahl'

export const TITEL = WIEDERHOLUNGEN_JE_SATZ_TITEL

// Sechs Farben reichen: mehr als sechs Arbeitssaetze je Uebung ist selten, und
// danach wiederholt sich die Reihe, statt dass eine Linie unsichtbar wird.
// Zyklus aus derselben 5er-Design-Palette wie T6/E4 (Ruling: der Spec-Satz
// "T5 -> Mint" meint keine Einzelfarbe, siehe Plan-2d-Rationale zu T5) —
// Mint wiederholt sich fuer eine sechste Linie.
const FARBEN = [CHART_MINT, CHART_BLUE, CHART_GREEN, CHART_ORANGE, CHART_VIOLET, CHART_MINT]

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
