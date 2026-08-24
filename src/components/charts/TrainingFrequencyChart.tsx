import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { sessionsJeWoche } from '../../lib/analysis/training-charts'
import type { AnalysisSession } from '../../hooks/use-training-analysis'
import { TRAININGSFREQUENZ_TITEL } from '../../lib/analysis/chart-titles'
import ChartFrame from './ChartFrame'

export const TITEL = TRAININGSFREQUENZ_TITEL

export default function TrainingFrequencyChart({
  sessions,
  picker,
}: {
  sessions: AnalysisSession[]
  picker?: ReactNode
}) {
  const punkte = sessionsJeWoche(sessions)

  return (
    // Spec section 5: lines need two points, bars need one. A single bar still
    // states something ("3 Einheiten diese Woche"); a single line point does not.
    <ChartFrame titel={TITEL} leer={punkte.length < 1} picker={picker}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={punkte}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="woche" />
          {/* allowDecimals: half a session does not exist. */}
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(wert?: ValueType) => [`${wert}`, 'Einheiten']} />
          <Bar dataKey="anzahl" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
