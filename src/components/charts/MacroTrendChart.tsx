import type { ReactNode } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { makroVerlauf } from '../../lib/analysis/nutrition-charts'
import type { AnalysisFoodEntry } from '../../hooks/use-nutrition-analysis'
import { MAKRO_VERLAUF_TITEL } from '../../lib/analysis/chart-titles'
import { tagesLabel } from '../../lib/analysis/tages-label'
import ChartFrame from './ChartFrame'

export const TITEL = MAKRO_VERLAUF_TITEL

export default function MacroTrendChart({
  entries,
  picker,
}: {
  entries: AnalysisFoodEntry[]
  picker?: ReactNode
}) {
  const punkte = makroVerlauf(entries).map((punkt) => ({ ...punkt, label: tagesLabel(punkt.tag) }))

  return (
    <ChartFrame titel={TITEL} leer={punkte.length < 2} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis unit=" g" />
          <Tooltip />
          <Line type="monotone" dataKey="eiweiss" name="Eiweiß (g)" stroke="#8884d8" dot={false} />
          <Line type="monotone" dataKey="fett" name="Fett (g)" stroke="#ff7300" dot={false} />
          <Line
            type="monotone"
            dataKey="kohlenhydrate"
            name="Kohlenhydrate (g)"
            stroke="#82ca9d"
            dot={false}
          />
          <Legend />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
