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
import { UMFANG_FIELDS, umfaengeVerlauf, type UmfangFeld } from '../../lib/analysis/body-charts'
import { FIELD_LABELS, type BodyMetricRow } from '../../lib/body-metrics'
import { UMFAENGE_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = UMFAENGE_TITEL

/** Feste Farbe je Umfang: eine wechselnde Zuordnung waere zwischen zwei
 *  Zeitraeumen nicht wiedererkennbar. */
const FARBEN: Record<UmfangFeld, string> = {
  bauchumfang: '#8884d8',
  beinumfang: '#82ca9d',
  armumfang: '#ff7300',
  ruckenumfang: '#0088fe',
  brustumfang: '#d0468c',
}

export default function BodyMeasurementsChart({
  rows,
  picker,
}: {
  rows: BodyMetricRow[]
  picker?: ReactNode
}) {
  const punkte = umfaengeVerlauf(rows).map((punkt) => ({
    ...punkt,
    label: tagesLabel(punkt.datum),
  }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          {/* Nicht bei null beginnen: die interessante Spanne sind wenige
              Zentimeter, eine Achse ab 0 macht daraus fuenf Geraden. */}
          <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip />
          {UMFANG_FIELDS.map((feld) => (
            <Line
              key={feld}
              type="monotone"
              dataKey={feld}
              name={FIELD_LABELS[feld]}
              stroke={FARBEN[feld]}
              dot={false}
              // Wer den Bauch jede Woche misst und den Arm jeden Monat, hat
              // Luecken in vier von fuenf Linien; ohne das zerfaellt jede
              // Linie in unverbundene Stuecke.
              connectNulls
            />
          ))}
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
